/**
 * Schema Editor component that wraps Monaco Editor with schema-specific functionality.
 *
 * This component provides:
 * - JSON Schema editing with validation
 * - Save/revert functionality
 * - Format and validation actions
 * - Error reporting and navigation
 * - Integration with the app store
 *
 * @module SchemaEditor
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import {
  Save,
  RotateCcw,
  Code,
  AlertTriangle,
  FileText,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { MonacoEditor, ValidationError } from './MonacoEditor';
import { EditorShortcutsModal } from './EditorShortcutsModal';

import type { Schema } from '../../../types/schema-editor';
import logger from '../../lib/renderer-logger';
import { safeHandler } from '../../lib/error-handling';
import { toast } from 'sonner';
import { formatSchemaJsonString } from '../../lib/json-format';

/**
 * Props for the Schema Editor component.
 */
interface SchemaEditorProps {
  /** Schema being edited */
  schema: Schema;
  /** Current editor content */
  content: string;
  /** Whether the content has unsaved changes */
  isDirty: boolean;
  /** Callback when content changes */
  onContentChange: (content: string) => void;
  /** Callback when dirty state changes */
  onDirtyChange: (isDirty: boolean) => void;
  /** Callback when validation errors change */
  onValidationChange: (errors: ValidationError[]) => void;
  /** Current validation errors */
  errors: ValidationError[];
  /** Available schemas for ref navigation */
  availableSchemas?: Array<{ id: string; name: string; path: string }>;
  /** Callback when a ref is clicked */
  onRefClick?: (refPath: string) => void;
  /** Whether save all is in progress */
  isSaving?: boolean;
  /** Callback after a successful save with the saved content */
  onSaved?: (content: string) => void;
}

/**
 * Schema Editor component with Monaco integration.
 */
export function SchemaEditor({
  schema,
  content,
  isDirty,
  onContentChange,
  onDirtyChange,
  onValidationChange,
  errors,
  availableSchemas = [],
  onRefClick,
  isSaving: globalIsSaving = false,
  onSaved,
}: SchemaEditorProps): React.JSX.Element {
  const editorRef = useRef<{
    formatDocument: () => Promise<void>;
    validateJson: () => { valid: boolean; error: string | null };
    getCursorPosition: () => { line: number; column: number } | null;
    goToPosition: (line: number, column: number) => void;
    getValue: () => string;
  } | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(content);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  /**
   * Normalize content to match file system behavior.
   * Node.js fs.writeFile normalizes line endings and may trim trailing whitespace.
   */
  const normalizeContent = useCallback((rawContent: string): string => {
    // Normalize line endings to platform default (LF on Unix, CRLF on Windows)
    // Node.js writeFile will do this automatically, so we pre-normalize to match
    return rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }, []);

  /**
   * Handle content change in editor.
   */
  const handleContentChange = useCallback(
    safeHandler((newContent: string) => {
      onContentChange(newContent);

      // Compare normalized versions to avoid false positives from line ending differences
      const normalizedNew = normalizeContent(newContent);
      const normalizedSaved = normalizeContent(lastSavedContent);
      const hasChanges = normalizedNew !== normalizedSaved;
      onDirtyChange(hasChanges);

      logger.debug('Schema content changed', {
        schemaName: schema.name,
        hasChanges,
        contentLength: newContent.length,
        normalizedLength: normalizedNew.length,
      });
    }),
    [
      schema.name,
      lastSavedContent,
      onContentChange,
      onDirtyChange,
      normalizeContent,
    ],
  );

  /**
   * Handle validation errors from Monaco.
   */
  const handleValidationChange = useCallback(
    safeHandler((validationErrors: ValidationError[]) => {
      onValidationChange(validationErrors);

      logger.debug('Validation errors updated', {
        schemaName: schema.name,
        errorCount: validationErrors.length,
        errors: validationErrors.map((e) => ({
          line: e.line,
          message: e.message,
          severity: e.severity,
        })),
      });
    }),
    [schema.name, onValidationChange],
  );

  /**
   * Format the document.
   */
  const handleFormat = useCallback(
    safeHandler(() => {
      if (editorRef.current) {
        editorRef.current.formatDocument();
        logger.info('Document formatted', { schemaName: schema.name });
      }
    }),
    [schema.name],
  );

  /**
   * Validate the JSON content.
   */
  const handleValidate = useCallback(
    safeHandler(async () => {
      if (!editorRef.current) return;

      setIsValidating(true);

      try {
        const result = editorRef.current.validateJson();

        // Validation completed - no toast needed

        logger.info('JSON validation completed', {
          schemaName: schema.name,
          valid: result.valid,
          error: result.error,
        });
      } catch (error) {
        logger.error('Validation error', {
          schemaName: schema.name,
          error: error instanceof Error ? error.message : error,
        });
      } finally {
        setIsValidating(false);
      }
    }),
    [schema.name],
  );

  /**
   * Save the schema content.
   */
  const handleSave = useCallback(
    safeHandler(async () => {
      if (!window.api) {
        toast.error('Save failed', {
          description: 'File system API not available',
        });
        return;
      }

      setIsSaving(true);

      try {
        // Custom format before validating/saving: sort enum values and properties keys
        if (editorRef.current) {
          try {
            const currentRaw = editorRef.current.getValue();
            const customFormatted = formatSchemaJsonString(currentRaw);
            if (customFormatted !== currentRaw) {
              editorRef.current.setValue(customFormatted);
            }
          } catch (_e) {
            // non-blocking
          }

          // Best-effort Monaco native formatter (optional)
          try {
            await editorRef.current.formatDocument();
          } catch (_e) {
            // non-blocking
          }
        }

        // Validate JSON before saving
        if (editorRef.current) {
          const validation = editorRef.current.validateJson();
          if (!validation.valid) {
            logger.warn('SchemaEditor: validation failed', {
              schemaName: schema.name,
              error: validation.error,
            });
            toast.error('Cannot save invalid JSON', {
              description:
                validation.error || 'Please fix JSON syntax errors first',
            });
            setIsSaving(false);
            return;
          }
        }

        // Use current editor value to avoid any race with prop updates
        const rawValue = editorRef.current
          ? editorRef.current.getValue()
          : content;

        // Normalize content to match what will be written to disk
        const normalizedValue = normalizeContent(rawValue);

        logger.debug('SchemaEditor: buffer prepared for save', {
          schemaName: schema.name,
          bufferLength: rawValue.length,
          normalizedLength: normalizedValue.length,
          propLength: content.length,
        });

        // Save to file system
        const result = await window.api.writeFile(schema.path, normalizedValue);

        if (result.success) {
          // Sync parent state to the exact normalized content that was saved
          // This prevents Monaco from seeing a difference and "reverting"
          try {
            onContentChange(normalizedValue);
          } catch (_e) {
            // ignore
          }

          setLastSavedContent(normalizedValue);
          onDirtyChange(false);

          // Notify parent so it can update store with latest content
          try {
            onSaved?.(normalizedValue);
          } catch (_e) {
            // ignore callback errors
          }

          logger.info('Schema saved successfully', {
            schemaName: schema.name,
            filePath: schema.path,
            contentLength: normalizedValue.length,
          });

          logger.debug('SchemaEditor: handleSave complete', {
            schemaName: schema.name,
            savedLength: normalizedValue.length,
          });
        } else {
          logger.error('Schema save failed', {
            schemaName: schema.name,
            filePath: schema.path,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('Schema save error', {
          schemaName: schema.name,
          filePath: schema.path,
          error: error instanceof Error ? error.message : error,
        });
      } finally {
        setIsSaving(false);
      }
    }),
    [
      schema.name,
      schema.path,
      content,
      onDirtyChange,
      onSaved,
      normalizeContent,
    ],
  );

  /**
   * Revert changes to original content.
   */
  const handleRevert = useCallback(
    safeHandler(() => {
      if (!isDirty) return;

      onContentChange(lastSavedContent);
      onDirtyChange(false);

      logger.info('Schema changes reverted', {
        schemaName: schema.name,
      });
    }),
    [schema.name, lastSavedContent, isDirty, onContentChange, onDirtyChange],
  );

  /**
   * Navigate to error location.
   */
  const handleErrorClick = useCallback(
    safeHandler((error: ValidationError) => {
      if (editorRef.current) {
        editorRef.current.goToPosition(error.line, error.column);

        logger.debug('Navigated to error location', {
          schemaName: schema.name,
          line: error.line,
          column: error.column,
          message: error.message,
        });
      }
    }),
    [schema.name],
  );

  // Create JSON Schema for validation (basic JSON Schema meta-schema)
  const jsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      $id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      type: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
      properties: { type: 'object' },
      required: { type: 'array', items: { type: 'string' } },
      additionalProperties: { type: 'boolean' },
      items: { type: 'object' },
      allOf: { type: 'array', items: { type: 'object' } },
      anyOf: { type: 'array', items: { type: 'object' } },
      oneOf: { type: 'array', items: { type: 'object' } },
      not: { type: 'object' },
      if: { type: 'object' },
      then: { type: 'object' },
      else: { type: 'object' },
      enum: { type: 'array' },
      const: {},
      format: { type: 'string' },
      pattern: { type: 'string' },
      minLength: { type: 'number', minimum: 0 },
      maxLength: { type: 'number', minimum: 0 },
      minimum: { type: 'number' },
      maximum: { type: 'number' },
      exclusiveMinimum: { type: 'number' },
      exclusiveMaximum: { type: 'number' },
      multipleOf: { type: 'number', minimum: 0 },
      minItems: { type: 'number', minimum: 0 },
      maxItems: { type: 'number', minimum: 0 },
      uniqueItems: { type: 'boolean' },
      minProperties: { type: 'number', minimum: 0 },
      maxProperties: { type: 'number', minimum: 0 },
      dependencies: { type: 'object' },
      propertyNames: { type: 'object' },
      patternProperties: { type: 'object' },
      definitions: { type: 'object' },
      $ref: { type: 'string' },
      $comment: { type: 'string' },
      default: {},
      examples: { type: 'array' },
      readOnly: { type: 'boolean' },
      writeOnly: { type: 'boolean' },
      deprecated: { type: 'boolean' },
    },
    additionalProperties: true,
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">
            {schema.metadata.title || schema.name}
          </Badge>
          <Badge
            variant={
              schema.validationStatus === 'valid' ? 'default' : 'destructive'
            }
          >
            {schema.validationStatus}
          </Badge>
          {isDirty && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            >
              Modified
            </Badge>
          )}
          {errors.length > 0 && (
            <Badge variant="destructive">
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevert}
            disabled={!isDirty}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revert
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            className="text-muted-foreground hover:text-foreground"
          >
            <Code className="w-4 h-4 mr-2" />
            Format
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleValidate}
            disabled={isValidating}
            className="text-muted-foreground hover:text-foreground"
          >
            {isValidating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Validate
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={
              !isDirty ||
              isSaving ||
              globalIsSaving ||
              errors.some((e) => e.severity === 'error')
            }
          >
            {isSaving || globalIsSaving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShortcutsModal(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 relative overflow-visible">
        <MonacoEditor
          ref={editorRef}
          value={content}
          onChange={handleContentChange}
          onValidationChange={handleValidationChange}
          language="json"
          jsonSchema={jsonSchema}
          height="100%"
          fontSize={12}
          tabSize={2}
          minimap={true}
          wordWrap={false}
          availableSchemas={availableSchemas}
          {...(onRefClick && { onRefClick })}
          onSave={handleSave}
          onSaveAll={() => {
            // Bubble up to tab-level Save All via keyboard only.
            // Parent Build binds Save All in tab context menu and header.
            try {
              const event = new CustomEvent('build-save-all');
              document.dispatchEvent(event);
            } catch (_e) {
              // ignore
            }
          }}
        />
      </div>

      {/* Error Panel */}
      {errors.length > 0 && (
        <div className="border-t border-border/50 bg-muted/10 flex-shrink-0">
          <div className="flex items-center gap-2 p-2 border-b border-border/30">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">
              {errors.length} validation error{errors.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ScrollArea className="h-32 max-h-32">
            <div className="p-3 space-y-2">
              {errors.map((error, index) => (
                <Alert
                  key={index}
                  variant={
                    error.severity === 'error' ? 'destructive' : 'default'
                  }
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleErrorClick(error)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    Line {error.line}, Column {error.column}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {error.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Shortcuts Modal */}
      <EditorShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
    </div>
  );
}

export default SchemaEditor;
