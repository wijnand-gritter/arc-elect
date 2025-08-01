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
import { Save, RotateCcw, Code, AlertTriangle, FileText, Zap } from 'lucide-react';
import { MonacoEditor, ValidationError } from './MonacoEditor';

import type { Schema } from '../../../types/schema-editor';
import logger from '../../lib/renderer-logger';
import { safeHandler } from '../../lib/error-handling';
import { toast } from 'sonner';

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
}: SchemaEditorProps): React.JSX.Element {
  const editorRef = useRef<{
    formatDocument: () => void;
    validateJson: () => { valid: boolean; error: string | null };
    getCursorPosition: () => { line: number; column: number } | null;
    goToPosition: (line: number, column: number) => void;
  } | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(content);

  /**
   * Handle content change in editor.
   */
  const handleContentChange = useCallback(
    safeHandler((newContent: string) => {
      onContentChange(newContent);
      const hasChanges = newContent !== lastSavedContent;
      onDirtyChange(hasChanges);

      logger.debug('Schema content changed', {
        schemaName: schema.name,
        hasChanges,
        contentLength: newContent.length,
      });
    }),
    [schema.name, lastSavedContent, onContentChange, onDirtyChange],
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
        toast.success('Document formatted', {
          description: 'JSON has been formatted with proper indentation',
        });

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

        if (result.valid) {
          toast.success('Validation successful', {
            description: 'JSON schema is valid',
          });
        } else {
          toast.error('Validation failed', {
            description: result.error || 'Invalid JSON syntax',
          });
        }

        logger.info('JSON validation completed', {
          schemaName: schema.name,
          valid: result.valid,
          error: result.error,
        });
      } catch (error) {
        toast.error('Validation error', {
          description: 'An error occurred during validation',
        });

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
        // Validate JSON before saving
        if (editorRef.current) {
          const validation = editorRef.current.validateJson();
          if (!validation.valid) {
            toast.error('Cannot save invalid JSON', {
              description: validation.error || 'Please fix JSON syntax errors first',
            });
            setIsSaving(false);
            return;
          }
        }

        // Save to file system
        const result = await window.api.writeFile(schema.path, content);

        if (result.success) {
          setLastSavedContent(content);
          onDirtyChange(false);

          toast.success('Schema saved', {
            description: `${schema.name} has been saved successfully`,
          });

          logger.info('Schema saved successfully', {
            schemaName: schema.name,
            filePath: schema.path,
            contentLength: content.length,
          });
        } else {
          toast.error('Save failed', {
            description: result.error || 'Failed to save schema',
          });

          logger.error('Schema save failed', {
            schemaName: schema.name,
            filePath: schema.path,
            error: result.error,
          });
        }
      } catch (error) {
        toast.error('Save error', {
          description: 'An unexpected error occurred while saving',
        });

        logger.error('Schema save error', {
          schemaName: schema.name,
          filePath: schema.path,
          error: error instanceof Error ? error.message : error,
        });
      } finally {
        setIsSaving(false);
      }
    }),
    [schema.name, schema.path, content, onDirtyChange],
  );

  /**
   * Revert changes to original content.
   */
  const handleRevert = useCallback(
    safeHandler(() => {
      if (!isDirty) return;

      onContentChange(lastSavedContent);
      onDirtyChange(false);

      toast.success('Changes reverted', {
        description: 'Content has been restored to last saved version',
      });

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
        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      },
      properties: { type: 'object' },
      required: { type: 'array', items: { type: 'string' } },
      additionalProperties: { type: 'boolean' },
    },
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">{schema.metadata.title || schema.name}</Badge>
          <Badge variant={schema.validationStatus === 'valid' ? 'default' : 'destructive'}>
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
            disabled={!isDirty || isSaving || errors.some((e) => e.severity === 'error')}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 relative">
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
                  variant={error.severity === 'error' ? 'destructive' : 'default'}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleErrorClick(error)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    Line {error.line}, Column {error.column}
                  </AlertTitle>
                  <AlertDescription className="text-sm">{error.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default SchemaEditor;
