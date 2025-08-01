/**
 * Monaco Editor component for JSON Schema editing.
 *
 * This component provides a full-featured JSON editor with:
 * - Syntax highlighting and validation
 * - Auto-completion and IntelliSense
 * - Error detection and reporting
 * - Format and validation actions
 * - Theme integration
 *
 * @module MonacoEditor
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import MonacoEditorReact, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from 'next-themes';
import logger from '../../lib/renderer-logger';
import { safeHandler } from '../../lib/error-handling';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * Interface for validation errors.
 */
export interface ValidationError {
  /** Line number where error occurs (1-based) */
  line: number;
  /** Column number where error occurs (1-based) */
  column: number;
  /** Error message */
  message: string;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
  /** Start position in editor */
  startLineNumber: number;
  /** Start column in editor */
  startColumn: number;
  /** End line number in editor */
  endLineNumber: number;
  /** End column in editor */
  endColumn: number;
}

/**
 * Props for the Monaco Editor component.
 */
interface MonacoEditorProps {
  /** Initial content of the editor */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Callback when validation errors change */
  onValidationChange?: (errors: ValidationError[]) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Height of the editor */
  height?: string;
  /** Language mode (default: json) */
  language?: string;
  /** Schema for JSON validation */
  jsonSchema?: object;
  /** Whether to show minimap */
  minimap?: boolean;
  /** Whether to enable word wrap */
  wordWrap?: boolean;
  /** Font size */
  fontSize?: number;
  /** Tab size */
  tabSize?: number;
  /** Font family */
  fontFamily?: string;
}

/**
 * Monaco Editor component with JSON Schema validation.
 */
export const MonacoEditor = React.forwardRef<
  {
    formatDocument: () => void;
    validateJson: () => { valid: boolean; error: string | null };
    getCursorPosition: () => { line: number; column: number } | null;
    goToPosition: (line: number, column: number) => void;
  },
  MonacoEditorProps
>(function MonacoEditor(
  {
    value,
    onChange,
    onValidationChange,
    readOnly = false,
    height = '400px',
    language = 'json',
    jsonSchema,
    minimap = true,
    wordWrap = false,
    fontSize = 14,
    tabSize = 2,
    fontFamily = '"Monaspace Neon", Consolas, "Courier New", monospace',
  },
  ref,
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onValidationChangeRef = useRef(onValidationChange);
  const onChangeRef = useRef(onChange);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationRef = useRef<string>('');
  const { theme } = useTheme();
  const [isReady, setIsReady] = React.useState(false);

  // Update refs when props change
  onValidationChangeRef.current = onValidationChange;
  onChangeRef.current = onChange;

  /**
   * Handle editor mount.
   */
  const handleEditorDidMount = React.useCallback(
    safeHandler((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;
      setIsReady(true);

      // Configure JSON language features
      if (language === 'json') {
        // Set JSON schema if provided
        if (jsonSchema) {
          monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
            schemas: [
              {
                uri: 'http://json-schema.org/draft-07/schema#',
                fileMatch: ['*'],
                schema: jsonSchema,
              },
            ],
          });
        }

        // Enable JSON validation
        monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          schemaValidation: 'error',
          schemaRequest: 'error',
        });
      }

      // Set up debounced validation to prevent infinite loops
      const setupValidation = () => {
        if (!onValidationChangeRef.current) return;

        const model = editor.getModel();
        if (!model) return;

        const checkValidation = () => {
          const currentContent = model.getValue();

          // Only process if content actually changed
          if (currentContent === lastValidationRef.current) {
            return;
          }

          lastValidationRef.current = currentContent;

          // Clear existing timeout
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
          }

          // Debounce validation check
          validationTimeoutRef.current = setTimeout(() => {
            try {
              const markers = monacoInstance.editor.getModelMarkers({ resource: model.uri });
              const errors: ValidationError[] = markers.map((marker) => ({
                line: marker.startLineNumber,
                column: marker.startColumn,
                message: marker.message,
                severity:
                  marker.severity === monacoInstance.MarkerSeverity.Error
                    ? 'error'
                    : marker.severity === monacoInstance.MarkerSeverity.Warning
                      ? 'warning'
                      : 'info',
                startLineNumber: marker.startLineNumber,
                startColumn: marker.startColumn,
                endLineNumber: marker.endLineNumber,
                endColumn: marker.endColumn,
              }));

              onValidationChangeRef.current?.(errors);
            } catch (error) {
              logger.error('Validation check failed', { error });
            }
          }, 500); // 500ms debounce
        };

        // Initial validation check
        setTimeout(checkValidation, 100);

        // Listen for content changes only
        const disposable = model.onDidChangeContent(() => {
          checkValidation();
        });

        return disposable;
      };

      // Configure editor options
      editor.updateOptions({
        fontSize,
        fontFamily,
        tabSize,
        insertSpaces: true,
        detectIndentation: false,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: minimap },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        contextmenu: true,
        folding: true,
        lineNumbers: 'on',
        renderWhitespace: 'boundary',
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
      });

      // Add custom actions
      editor.addAction({
        id: 'format-document',
        label: 'Format Document',
        keybindings: [
          monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
        ],
        contextMenuGroupId: 'modification',
        run: () => {
          editor.getAction('editor.action.formatDocument')?.run();
        },
      });

      editor.addAction({
        id: 'validate-json',
        label: 'Validate JSON',
        keybindings: [
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyV,
        ],
        contextMenuGroupId: 'modification',
        run: () => {
          try {
            const content = editor.getValue();
            JSON.parse(content);
            logger.info('JSON validation successful');
          } catch (error) {
            logger.error('JSON validation failed', {
              error: error instanceof Error ? error.message : error,
            });
          }
        },
      });

      logger.info('Monaco Editor mounted successfully', {
        language,
        readOnly,
        hasSchema: !!jsonSchema,
      });

      const validationDisposable = setupValidation();

      // Cleanup function
      const cleanup = () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        validationDisposable?.dispose();
      };

      return cleanup;
    }),
    [language, jsonSchema, fontSize, fontFamily, tabSize, wordWrap, minimap],
  );

  /**
   * Handle content change.
   */
  const handleChange = React.useCallback(
    safeHandler((newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChangeRef.current(newValue);
      }
    }),
    [],
  );

  /**
   * Format the document.
   */
  const formatDocument = React.useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  /**
   * Validate JSON content.
   */
  const validateJson = React.useCallback(() => {
    if (editorRef.current) {
      try {
        const content = editorRef.current.getValue();
        JSON.parse(content);
        return { valid: true, error: null };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid JSON',
        };
      }
    }
    return { valid: false, error: 'Editor not ready' };
  }, []);

  /**
   * Get current cursor position.
   */
  const getCursorPosition = React.useCallback(() => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      return position ? { line: position.lineNumber, column: position.column } : null;
    }
    return null;
  }, []);

  /**
   * Go to specific line and column.
   */
  const goToPosition = React.useCallback((line: number, column: number) => {
    if (editorRef.current) {
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.revealPositionInCenter({ lineNumber: line, column });
      editorRef.current.focus();
    }
  }, []);

  // Expose methods to parent component
  React.useImperativeHandle(
    ref,
    () => ({
      formatDocument,
      validateJson,
      getCursorPosition,
      goToPosition,
    }),
    [formatDocument, validateJson, getCursorPosition, goToPosition],
  );

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current && isReady) {
      const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [theme, isReady]);

  // Update JSON schema when it changes
  useEffect(() => {
    if (monacoRef.current && isReady && language === 'json' && jsonSchema) {
      monacoRef.current.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [
          {
            uri: 'http://json-schema.org/draft-07/schema#',
            fileMatch: ['*'],
            schema: jsonSchema,
          },
        ],
      });
    }
  }, [jsonSchema, isReady, language]);

  return (
    <div className="relative w-full h-full" style={{ height }}>
      <ErrorBoundary>
        <MonacoEditorReact
          value={value}
          language={language}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize,
            fontFamily,
            tabSize,
            insertSpaces: true,
            detectIndentation: false,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: minimap },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            contextmenu: true,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'boundary',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading editor...</p>
              </div>
            </div>
          }
        />
      </ErrorBoundary>
    </div>
  );
});

export default MonacoEditor;
