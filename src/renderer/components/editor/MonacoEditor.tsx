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
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (errors: ValidationError[]) => void;
  readOnly?: boolean;
  height?: string;
  language?: string;
  jsonSchema?: object;
  minimap?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
  tabSize?: number;
  fontFamily?: string;
  availableSchemas?: Array<{ id: string; name: string; path: string }>;
  onRefClick?: (refPath: string) => void;
}

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
    fontFamily = '"JetBrains Mono", Consolas, "Courier New", monospace',
    availableSchemas = [],
    onRefClick,
  },
  ref,
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onValidationChangeRef = useRef(onValidationChange);
  const onChangeRef = useRef(onChange);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationRef = useRef<string>('');
  const completionProviderRef = useRef<monaco.IDisposable | null>(null);
  const { theme } = useTheme();
  const [isReady, setIsReady] = React.useState(false);

  onValidationChangeRef.current = onValidationChange;
  onChangeRef.current = onChange;

  const handleEditorDidMount = React.useCallback(
    safeHandler((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;
      setIsReady(true);

      if (language === 'json') {
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

        monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          schemaValidation: 'error',
          schemaRequest: 'ignore',
        });

        // --- FIXED SUGGESTION PROVIDER WITH DYNAMIC RANGE ---
        if (onRefClick && availableSchemas.length > 0) {
          if (completionProviderRef.current) {
            completionProviderRef.current.dispose();
          }

          completionProviderRef.current = monacoInstance.languages.registerCompletionItemProvider(
            'json',
            {
              triggerCharacters: ['"', '/', '.', '\\', ' '],
              provideCompletionItems: (model, position) => {
                const lineContent = model.getLineContent(position.lineNumber);
                const colonIndex = lineContent.indexOf(':');
                if (colonIndex === -1) return { suggestions: [] };

                const firstQuoteIndex = lineContent.indexOf('"', colonIndex);
                const closingQuoteIndex = lineContent.indexOf('"', firstQuoteIndex + 1);

                // Only show if cursor is inside the quotes!
                if (
                  firstQuoteIndex === -1 ||
                  position.column <= firstQuoteIndex + 1 ||
                  (closingQuoteIndex !== -1 && position.column > closingQuoteIndex + 1)
                ) {
                  return { suggestions: [] };
                }

                const quoteContentStart = firstQuoteIndex + 1;
                const cursorOffset = position.column - 1;
                const valueSoFar = lineContent.substring(quoteContentStart, cursorOffset);

                // everything user typed so far
                const typedPrefix = valueSoFar;

                // Always relative, always prefixed with ./
                function toRelativePath(fullPath: string) {
                  const idx = fullPath.indexOf('schemas/');
                  const rel =
                    idx !== -1
                      ? fullPath.substring(idx + 'schemas/'.length)
                      : fullPath.replace(/^\.?\//, '');
                  return './' + rel.replace(/^(\.\/)+/, '');
                }

                // === FIX: Case-insensitive, match on full typed prefix (e.g., "./b" matches "./business-objects/Address.schema.json") ===
                const typedPrefixLower = typedPrefix.toLowerCase();

                const suggestions = availableSchemas
                  .map((schema) => {
                    const relPath = toRelativePath(schema.path);
                    // Only insert the part the user hasn't typed yet
                    const insertText = typedPrefix
                      ? relPath.substring(typedPrefix.length)
                      : relPath;
                    return {
                      label: relPath,
                      kind: monacoInstance.languages.CompletionItemKind.Reference,
                      insertText,
                      detail: `Schema: ${schema.name}`,
                      documentation: `Reference to ${relPath}`,
                      range: {
                        startLineNumber: position.lineNumber,
                        startColumn: typedPrefix
                          ? quoteContentStart +
                            typedPrefix.length +
                            1 -
                            (typedPrefix.length ? 0 : 1)
                          : quoteContentStart + 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column,
                      },
                      filterText: relPath, // Helps Monaco match the suggestion even if prefix is incomplete
                    };
                  })
                  .filter(
                    (s) => !typedPrefix || s.label.toLowerCase().startsWith(typedPrefixLower),
                  );

                return { suggestions };
              },
            },
          );
        }

        // Navigation (F12)
        if (onRefClick) {
          editor.addAction({
            id: 'navigate-to-ref',
            label: 'Navigate to Reference',
            keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.F12],
            contextMenuGroupId: 'navigation',
            run: () => {
              const position = editor.getPosition();
              if (!position) return;
              const model = editor.getModel();
              if (!model) return;
              const word = model.getWordAtPosition(position);
              if (!word) return;

              const lineContent = model.getLineContent(position.lineNumber);
              const refMatch = lineContent.match(/"\$ref"\s*:\s*"([^"]+)"/);
              if (refMatch) {
                const refPath = refMatch[1];
                onRefClick(refPath);
              }
            },
          });
        }
      }

      // Validation
      const setupValidation = () => {
        if (!onValidationChangeRef.current) return;
        const model = editor.getModel();
        if (!model) return;

        const checkValidation = () => {
          const currentContent = model.getValue();
          if (currentContent === lastValidationRef.current) {
            return;
          }
          lastValidationRef.current = currentContent;
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
          }
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
          }, 500);
        };

        setTimeout(checkValidation, 100);
        const disposable = model.onDidChangeContent(() => {
          checkValidation();
        });
        return disposable;
      };

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
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle: 'line',
        multiCursorModifier: 'alt',
        accessibilitySupport: 'auto',
        autoIndent: 'full',
        formatOnPaste: false,
        formatOnType: false,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        renderLineHighlight: 'all',
        mouseWheelScrollSensitivity: 1,
        fastScrollSensitivity: 5,
      });

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
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON syntax';
            logger.error('JSON validation failed', { error: errorMessage });
          }
        },
      });

      logger.info('Monaco Editor mounted successfully', {
        language,
        readOnly,
        hasSchema: !!jsonSchema,
      });

      const validationDisposable = setupValidation();

      const cleanup = () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        validationDisposable?.dispose();
        if (completionProviderRef.current) {
          completionProviderRef.current.dispose();
        }
      };

      return cleanup;
    }),
    [language, jsonSchema, fontSize, fontFamily, tabSize, wordWrap, minimap],
  );

  const handleChange = React.useCallback(
    safeHandler((newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChangeRef.current(newValue);
      }
    }),
    [],
  );

  const formatDocument = React.useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

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

  const getCursorPosition = React.useCallback(() => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      return position ? { line: position.lineNumber, column: position.column } : null;
    }
    return null;
  }, []);

  const goToPosition = React.useCallback((line: number, column: number) => {
    if (editorRef.current) {
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.revealPositionInCenter({ lineNumber: line, column });
      editorRef.current.focus();
    }
  }, []);

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

  useEffect(() => {
    if (monacoRef.current && isReady) {
      const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [theme, isReady]);

  useEffect(() => {
    if (monacoRef.current && isReady && language === 'json' && jsonSchema) {
      monacoRef.current.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemaRequest: 'ignore',
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
