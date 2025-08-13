import React, { useEffect, useRef } from 'react';
import MonacoEditorReact, { Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { useTheme } from 'next-themes';
import logger from '../../lib/renderer-logger';
import { safeHandler } from '../../lib/error-handling';
import { ErrorBoundary } from '../ErrorBoundary';
import { formatSchemaJsonString } from '../../lib/json-format';

// Configure Monaco Editor to use local assets instead of CDN
loader.config({ monaco });

// Configure Monaco Environment
// Use empty stub only to satisfy Monaco without spinning real workers.
// Our CSP allows worker-src data: blob:, but we intentionally avoid workers to honor user preference.
try {
  (
    self as unknown as { MonacoEnvironment?: { getWorkerUrl: () => string } }
  ).MonacoEnvironment = {
    getWorkerUrl: () => 'data:application/javascript,',
  };
} catch {
  // ignore
}

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
  availableSchemas?: Array<{
    id: string;
    name: string;
    path: string; // relative './' path
    validationStatus?: 'pending' | 'valid' | 'invalid';
    metadata?: { title?: string; description?: string };
    content?: Record<string, unknown>;
  }>;

  onRefClick?: (refPath: string) => void;
  onSave?: () => void;
  onSaveAll?: () => void;
}

export const MonacoEditor = React.forwardRef<
  {
    formatDocument: () => Promise<void>;
    validateJson: () => { valid: boolean; error: string | null };
    getCursorPosition: () => { line: number; column: number } | null;
    goToPosition: (line: number, column: number) => void;
    getValue: () => string;
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
    onSave,
    onSaveAll,
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
  const hoverProviderRef = useRef<monaco.IDisposable | null>(null);
  const { theme } = useTheme();
  const [isReady, setIsReady] = React.useState(false);

  onValidationChangeRef.current = onValidationChange;
  onChangeRef.current = onChange;

  const handleEditorDidMount = React.useCallback(
    safeHandler(
      (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        setIsReady(true);

        if (language === 'json') {
          // JSON validation is already disabled globally to prevent worker issues

          // Register a custom, minimal formatting provider that ONLY sorts:
          // - enum arrays A→Z
          // - keys within any `properties` object A→Z
          const _formattingProvider =
            monacoInstance.languages.registerDocumentFormattingEditProvider(
              'json',
              {
                provideDocumentFormattingEdits(model) {
                  try {
                    const text = model.getValue();
                    const formatted = formatSchemaJsonString(text);
                    if (formatted === text) return [];
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formatted,
                      },
                    ];
                  } catch (e) {
                    logger.debug('Custom JSON formatter skipped', {
                      error: e instanceof Error ? e.message : String(e),
                    });
                    return [];
                  }
                },
              },
            );
          void _formattingProvider;

          // --- FIXED SUGGESTION PROVIDER WITH DYNAMIC RANGE ---
          if (onRefClick && availableSchemas.length > 0) {
            if (completionProviderRef.current) {
              completionProviderRef.current.dispose();
            }

            completionProviderRef.current =
              monacoInstance.languages.registerCompletionItemProvider('json', {
                triggerCharacters: ['"', '/', '.', '\\', ' ', ':', ','],
                provideCompletionItems: (model, position) => {
                  const lineContent = model.getLineContent(position.lineNumber);
                  const colonIndex = lineContent.indexOf(':');
                  if (colonIndex === -1) return { suggestions: [] };

                  // Find first quote after colon (start of value)
                  const firstQuoteIndex = lineContent.indexOf('"', colonIndex);
                  const closingQuoteIndex =
                    firstQuoteIndex !== -1
                      ? lineContent.indexOf('"', firstQuoteIndex + 1)
                      : -1;

                  const quoteContentStart =
                    firstQuoteIndex !== -1 ? firstQuoteIndex + 1 : -1;
                  const cursorOffset = position.column - 1;

                  // Get the value up to the cursor, if inside or after quotes
                  let valueSoFar = '';
                  let insideQuotes = false;
                  if (
                    firstQuoteIndex !== -1 &&
                    position.column > firstQuoteIndex + 1 &&
                    (closingQuoteIndex === -1 ||
                      position.column <= closingQuoteIndex + 1)
                  ) {
                    // Cursor inside quotes
                    insideQuotes = true;
                    valueSoFar = lineContent.substring(
                      quoteContentStart,
                      cursorOffset,
                    );
                  } else if (
                    firstQuoteIndex === -1 &&
                    position.column > colonIndex + 1
                  ) {
                    // No quotes yet, but after colon (bare value)
                    valueSoFar = '';
                  } else if (
                    firstQuoteIndex !== -1 &&
                    position.column <= firstQuoteIndex + 1
                  ) {
                    // Cursor before opening quote
                    return { suggestions: [] };
                  }

                  // Path logic
                  const lastSlashIdx = valueSoFar.lastIndexOf('/');
                  const pathPrefix =
                    lastSlashIdx !== -1
                      ? valueSoFar.substring(0, lastSlashIdx + 1)
                      : '';
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

                  const typedPrefixLower = typedPrefix.toLowerCase();

                  const suggestions = availableSchemas
                    .map((schema) => {
                      // Normalize paths to forward slashes for consistent frontend handling
                      const normalizedPath = schema.path.replace(/\\/g, '/');
                      const relPath = toRelativePath(normalizedPath);
                      const insertText = typedPrefix
                        ? relPath.substring(pathPrefix.length)
                        : relPath;

                      // Determine range for replacement:
                      let startColumn: number;
                      let endColumn: number;
                      if (insideQuotes) {
                        startColumn =
                          quoteContentStart +
                          (lastSlashIdx !== -1 ? lastSlashIdx + 2 : 1);
                        endColumn = position.column;
                      } else {
                        // Not inside quotes: find the first non-space after the colon, don't overwrite spaces
                        let sc = colonIndex + 2;
                        while (
                          lineContent[sc - 1] === ' ' &&
                          sc <= lineContent.length
                        ) {
                          sc++;
                        }
                        startColumn = sc;
                        endColumn = position.column;
                      }

                      let finalInsertText = insertText;
                      if (!insideQuotes) {
                        // Ensure the value is quoted if user hasn't typed a quote
                        finalInsertText = `"${relPath}"`;
                      }

                      return {
                        label: relPath,
                        kind: monacoInstance.languages.CompletionItemKind
                          .Reference,
                        insertText: finalInsertText,
                        detail: `Schema: ${schema.name}`,
                        documentation: `Reference to ${relPath}`,
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn,
                          endLineNumber: position.lineNumber,
                          endColumn,
                        },
                        filterText: relPath,
                      };
                    })
                    .filter(
                      (s) =>
                        !typedPrefix ||
                        s.label.toLowerCase().startsWith(typedPrefixLower),
                    );

                  // Add JSON Schema keyword and value completion
                  const additionalSuggestions: monaco.languages.CompletionItem[] =
                    [];

                  // Check if we're on a property name (left side of colon)
                  const propertyMatch = lineContent.match(/"([^"]*)"\s*:\s*$/);
                  if (propertyMatch) {
                    // Suggest JSON Schema keywords
                    const schemaKeywords = [
                      {
                        label: 'type',
                        detail: 'Data type',
                        documentation: 'Defines the data type of the schema',
                      },
                      {
                        label: 'title',
                        detail: 'Schema title',
                        documentation: 'Human-readable title for the schema',
                      },
                      {
                        label: 'description',
                        detail: 'Schema description',
                        documentation:
                          'Detailed description of the schema purpose',
                      },
                      {
                        label: 'required',
                        detail: 'Required properties',
                        documentation:
                          'Array of property names that must be present',
                      },
                      {
                        label: 'properties',
                        detail: 'Schema properties',
                        documentation:
                          'Defines the properties of an object schema',
                      },
                      {
                        label: 'items',
                        detail: 'Array items',
                        documentation: 'Defines the schema for array elements',
                      },
                      {
                        label: 'enum',
                        detail: 'Enumeration',
                        documentation:
                          'Restricts values to a specific set of options',
                      },
                      {
                        label: 'const',
                        detail: 'Constant value',
                        documentation:
                          'The value must exactly match this constant',
                      },
                      {
                        label: 'format',
                        detail: 'String format',
                        documentation: 'Specifies the format of string values',
                      },
                      {
                        label: 'pattern',
                        detail: 'Regex pattern',
                        documentation: 'String must match this regex pattern',
                      },
                      {
                        label: 'minimum',
                        detail: 'Minimum value',
                        documentation: 'Numeric value must be >= this value',
                      },
                      {
                        label: 'maximum',
                        detail: 'Maximum value',
                        documentation: 'Numeric value must be <= this value',
                      },
                      {
                        label: 'minLength',
                        detail: 'Minimum length',
                        documentation:
                          'String must have at least this many characters',
                      },
                      {
                        label: 'maxLength',
                        detail: 'Maximum length',
                        documentation:
                          'String must have at most this many characters',
                      },
                      {
                        label: 'minItems',
                        detail: 'Minimum items',
                        documentation:
                          'Array must have at least this many elements',
                      },
                      {
                        label: 'maxItems',
                        detail: 'Maximum items',
                        documentation:
                          'Array must have at most this many elements',
                      },
                      {
                        label: 'uniqueItems',
                        detail: 'Unique items',
                        documentation: 'All array elements must be unique',
                      },
                      {
                        label: 'additionalProperties',
                        detail: 'Additional properties',
                        documentation:
                          'Whether to allow properties not defined in schema',
                      },
                      {
                        label: 'allOf',
                        detail: 'All of',
                        documentation:
                          'Value must validate against ALL of these schemas',
                      },
                      {
                        label: 'anyOf',
                        detail: 'Any of',
                        documentation:
                          'Value must validate against AT LEAST ONE of these schemas',
                      },
                      {
                        label: 'oneOf',
                        detail: 'One of',
                        documentation:
                          'Value must validate against EXACTLY ONE of these schemas',
                      },
                      {
                        label: 'not',
                        detail: 'Not',
                        documentation:
                          'Value must NOT validate against this schema',
                      },
                      {
                        label: 'if',
                        detail: 'If condition',
                        documentation:
                          'Conditional validation - if this schema validates, then...',
                      },
                      {
                        label: 'then',
                        detail: 'Then',
                        documentation:
                          'If the "if" schema validates, then this schema must also validate',
                      },
                      {
                        label: 'else',
                        detail: 'Else',
                        documentation:
                          'If the "if" schema does not validate, then this schema must validate',
                      },
                      {
                        label: 'default',
                        detail: 'Default value',
                        documentation:
                          'Default value when property is not provided',
                      },
                      {
                        label: 'examples',
                        detail: 'Examples',
                        documentation:
                          'Sample values that are valid for this schema',
                      },
                      {
                        label: 'deprecated',
                        detail: 'Deprecated',
                        documentation: 'Indicates this property is deprecated',
                      },
                      {
                        label: 'readOnly',
                        detail: 'Read only',
                        documentation:
                          'Property should not be modified by clients',
                      },
                      {
                        label: 'writeOnly',
                        detail: 'Write only',
                        documentation:
                          'Property should not be returned by servers',
                      },
                    ];

                    schemaKeywords.forEach((keyword) => {
                      additionalSuggestions.push({
                        label: keyword.label,
                        kind: monacoInstance.languages.CompletionItemKind
                          .Keyword,
                        insertText: `"${keyword.label}"`,
                        detail: keyword.detail,
                        documentation: keyword.documentation,
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn:
                            position.column - (propertyMatch[1]?.length || 0),
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      });
                    });
                  }

                  // Check if we're on a value (right side of colon)
                  const valueMatch = lineContent.match(
                    /"([^"]+)"\s*:\s*"([^"]*)"$/,
                  );
                  if (valueMatch) {
                    const propertyName = valueMatch[1];
                    const currentValue = valueMatch[2];

                    // Type value suggestions
                    if (propertyName === 'type') {
                      const typeValues = [
                        {
                          label: 'string',
                          detail: 'Text values',
                          documentation: 'String data type',
                        },
                        {
                          label: 'number',
                          detail: 'Numeric values',
                          documentation: 'Integer or float numbers',
                        },
                        {
                          label: 'integer',
                          detail: 'Whole numbers',
                          documentation: 'Whole numbers only',
                        },
                        {
                          label: 'boolean',
                          detail: 'True/false values',
                          documentation: 'Boolean true or false',
                        },
                        {
                          label: 'object',
                          detail: 'Key-value pairs',
                          documentation: 'Object with properties',
                        },
                        {
                          label: 'array',
                          detail: 'Ordered list',
                          documentation: 'Array of values',
                        },
                        {
                          label: 'null',
                          detail: 'Null value',
                          documentation: 'Null value',
                        },
                      ];

                      typeValues.forEach((type) => {
                        additionalSuggestions.push({
                          label: type.label,
                          kind: monacoInstance.languages.CompletionItemKind
                            .Value,
                          insertText: `"${type.label}"`,
                          detail: type.detail,
                          documentation: type.documentation,
                          range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column - currentValue.length,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                          },
                        });
                      });
                    }

                    // Format value suggestions
                    if (propertyName === 'format') {
                      const formatValues = [
                        {
                          label: 'date',
                          detail: 'YYYY-MM-DD format',
                          documentation: 'Date in YYYY-MM-DD format',
                        },
                        {
                          label: 'date-time',
                          detail: 'ISO 8601 datetime',
                          documentation: 'ISO 8601 datetime format',
                        },
                        {
                          label: 'time',
                          detail: 'HH:MM:SS format',
                          documentation: 'Time in HH:MM:SS format',
                        },
                        {
                          label: 'email',
                          detail: 'Email address',
                          documentation: 'Valid email address format',
                        },
                        {
                          label: 'uri',
                          detail: 'URI/URL',
                          documentation: 'Valid URI or URL',
                        },
                        {
                          label: 'uri-reference',
                          detail: 'URI reference',
                          documentation: 'URI reference (relative or absolute)',
                        },
                        {
                          label: 'uuid',
                          detail: 'UUID format',
                          documentation: 'UUID format',
                        },
                        {
                          label: 'ipv4',
                          detail: 'IPv4 address',
                          documentation: 'IPv4 address format',
                        },
                        {
                          label: 'ipv6',
                          detail: 'IPv6 address',
                          documentation: 'IPv6 address format',
                        },
                        {
                          label: 'hostname',
                          detail: 'Hostname',
                          documentation: 'Valid hostname format',
                        },
                        {
                          label: 'regex',
                          detail: 'Regular expression',
                          documentation: 'Regular expression pattern',
                        },
                        {
                          label: 'json-pointer',
                          detail: 'JSON pointer',
                          documentation: 'JSON pointer format',
                        },
                        {
                          label: 'relative-json-pointer',
                          detail: 'Relative JSON pointer',
                          documentation: 'Relative JSON pointer format',
                        },
                      ];

                      formatValues.forEach((format) => {
                        additionalSuggestions.push({
                          label: format.label,
                          kind: monacoInstance.languages.CompletionItemKind
                            .Value,
                          insertText: `"${format.label}"`,
                          detail: format.detail,
                          documentation: format.documentation,
                          range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column - currentValue.length,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                          },
                        });
                      });
                    }

                    // Pattern regex suggestions
                    if (propertyName === 'pattern') {
                      const regexPatterns = [
                        {
                          label: '^[a-zA-Z0-9]+$',
                          detail: 'Alphanumeric only',
                          documentation: 'Only letters and numbers allowed',
                        },
                        {
                          label: '^[a-z0-9]+$',
                          detail: 'Lowercase alphanumeric',
                          documentation: 'Only lowercase letters and numbers',
                        },
                        {
                          label: '^[A-Z0-9]+$',
                          detail: 'Uppercase alphanumeric',
                          documentation: 'Only uppercase letters and numbers',
                        },
                        {
                          label: '^[a-zA-Z]+$',
                          detail: 'Letters only',
                          documentation: 'Only letters allowed',
                        },
                        {
                          label: '^[0-9]+$',
                          detail: 'Numbers only',
                          documentation: 'Only numbers allowed',
                        },
                        {
                          label:
                            '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                          detail: 'Email pattern',
                          documentation: 'Email address validation pattern',
                        },
                        {
                          label: '^https?://[^\\s/$.?#].[^\\s]*$',
                          detail: 'URL pattern',
                          documentation: 'HTTP/HTTPS URL validation pattern',
                        },
                        {
                          label: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
                          detail: 'Date pattern',
                          documentation: 'YYYY-MM-DD date format',
                        },
                        {
                          label: '^[0-9]{2}:[0-9]{2}:[0-9]{2}$',
                          detail: 'Time pattern',
                          documentation: 'HH:MM:SS time format',
                        },
                        {
                          label: '^[0-9]{10}$',
                          detail: 'Phone pattern',
                          documentation: '10-digit phone number',
                        },
                        {
                          label: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$',
                          detail: 'IBAN pattern',
                          documentation: 'IBAN bank account number',
                        },
                        {
                          label: '^[0-9]{16}$',
                          detail: 'Credit card',
                          documentation: '16-digit credit card number',
                        },
                      ];

                      regexPatterns.forEach((pattern) => {
                        additionalSuggestions.push({
                          label: pattern.label,
                          kind: monacoInstance.languages.CompletionItemKind
                            .Value,
                          insertText: `"${pattern.label}"`,
                          detail: pattern.detail,
                          documentation: pattern.documentation,
                          range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column - currentValue.length,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column,
                          },
                        });
                      });
                    }
                  }

                  // Add JSON Schema snippets
                  const snippetSuggestions: monaco.languages.CompletionItem[] =
                    [
                      {
                        label: 'object-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"type": "object",',
                          '"properties": {',
                          '  "${1:propertyName}": {',
                          '    "type": "${2:string}",',
                          '    "title": "${3:Property Title}",',
                          '    "description": "${4:Property description}"',
                          '  }',
                          '},',
                          '"required": ["${1:propertyName}"]',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'Object Schema',
                        documentation:
                          'Complete object schema with properties and validation',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: 'array-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"type": "array",',
                          '"items": {',
                          '  "type": "${1:string}"',
                          '},',
                          '"minItems": ${2:0},',
                          '"maxItems": ${3:100}',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'Array Schema',
                        documentation:
                          'Array schema with item validation and size constraints',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: 'string-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"type": "string",',
                          '"title": "${1:String Title}",',
                          '"description": "${2:String description}",',
                          '"minLength": ${3:0},',
                          '"maxLength": ${4:255},',
                          '"pattern": "${5:^[a-zA-Z0-9]+$}"',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'String Schema',
                        documentation:
                          'String schema with validation constraints',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: 'number-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"type": "number",',
                          '"title": "${1:Number Title}",',
                          '"description": "${2:Number description}",',
                          '"minimum": ${3:0},',
                          '"maximum": ${4:100},',
                          '"multipleOf": ${5:1}',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'Number Schema',
                        documentation:
                          'Number schema with range and multiple constraints',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: 'enum-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"type": "string",',
                          '"title": "${1:Enum Title}",',
                          '"description": "${2:Enum description}",',
                          '"enum": [',
                          '  "${3:option1}",',
                          '  "${4:option2}",',
                          '  "${5:option3}"',
                          '],',
                          '"default": "${3:option1}"',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'Enum Schema',
                        documentation:
                          'Enumeration schema with predefined options',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                      {
                        label: 'conditional-schema',
                        kind: monacoInstance.languages.CompletionItemKind
                          .Snippet,
                        insertText: [
                          '"if": {',
                          '  "properties": {',
                          '    "${1:propertyName}": { "type": "${2:string}" }',
                          '  }',
                          '},',
                          '"then": {',
                          '  "required": ["${1:propertyName}"]',
                          '},',
                          '"else": {',
                          '  "properties": {',
                          '    "${3:alternativeProperty}": { "type": "${4:string}" }',
                          '  }',
                          '}',
                        ].join('\n'),
                        insertTextRules:
                          monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                        detail: 'Conditional Schema',
                        documentation:
                          'Conditional validation schema with if/then/else',
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                    ];

                  return {
                    suggestions: [
                      ...suggestions,
                      ...additionalSuggestions,
                      ...snippetSuggestions,
                    ],
                  };
                },
              });
          }

          // Professional Hover Provider for Schema References
          // Ensure we only ever have one provider alive at a time
          if (hoverProviderRef.current) {
            hoverProviderRef.current.dispose();
            hoverProviderRef.current = null;
          }

          if (availableSchemas.length > 0) {
            hoverProviderRef.current =
              monacoInstance.languages.registerHoverProvider('json', {
                provideHover: (model, position) => {
                  const word = model.getWordAtPosition(position);
                  if (!word) return null;

                  const lineContent = model.getLineContent(position.lineNumber);

                  // Check if we're on a $ref value
                  const refMatch = lineContent.match(/"\$ref"\s*:\s*"([^"]+)"/);
                  if (refMatch) {
                    const refPath = refMatch[1];

                    // Find the corresponding schema
                    const schema = availableSchemas.find((s) => {
                      // Normalize paths for consistent matching with './'

                      const normalizedPath = s.path.replace(/\\/g, '/');
                      const relativePath = normalizedPath.startsWith('./')
                        ? normalizedPath
                        : `./${normalizedPath.replace(/^\.\//, '')}`;
                      const normalizedRefPath = refPath
                        .replace(/\\/g, '/')
                        .replace(/^\.\//, './');
                      return (
                        relativePath === normalizedRefPath ||
                        normalizedPath === normalizedRefPath
                      );
                    });

                    if (schema) {
                      try {
                        const contents: Array<{
                          value: string;
                          isTrusted: boolean;
                        }> = [
                          {
                            value: `**Schema Reference:** \`${refPath}\``,
                            isTrusted: true,
                          },
                          {
                            value: `**Schema Name:** ${schema.name}`,
                            isTrusted: true,
                          },
                          {
                            value: `**Schema Path:** \`${schema.path}\``,
                            isTrusted: true,
                          },
                        ];

                        // Add schema metadata if available
                        if (schema.metadata?.title) {
                          contents.push({
                            value: `**Title:** ${schema.metadata.title}`,
                            isTrusted: true,
                          });
                        }
                        if (schema.metadata?.description) {
                          contents.push({
                            value: `**Description:** ${schema.metadata.description}`,
                            isTrusted: true,
                          });
                        }

                        // Add validation status
                        contents.push({
                          value: `**Status:** ${schema.validationStatus ?? 'pending'}`,
                          isTrusted: true,
                        });
                        logger.debug('schema.content', { schema });
                        // Add schema content if available (from store)
                        if (schema.content) {
                          if (schema.content.type) {
                            contents.push({
                              value: `**Type:** \`${schema.content.type}\``,
                              isTrusted: true,
                            });
                          }
                          if (
                            typeof (
                              schema.content as {
                                properties?: Record<string, unknown>;
                              }
                            ).properties === 'object' &&
                            (
                              schema.content as {
                                properties?: Record<string, unknown>;
                              }
                            ).properties
                          ) {
                            const propCount = Object.keys(
                              (
                                schema.content as {
                                  properties: Record<string, unknown>;
                                }
                              ).properties,
                            ).length;
                            contents.push({
                              value: `**Properties:** ${propCount} ${propCount === 1 ? 'property' : 'properties'}`,
                              isTrusted: true,
                            });
                          }
                          if (
                            typeof schema.content === 'object' &&
                            schema.content !== null &&
                            Array.isArray(
                              (schema.content as { required?: unknown[] })
                                .required,
                            )
                          ) {
                            const requiredList = (
                              schema.content as { required?: unknown[] }
                            ).required as unknown[];
                            const rendered = requiredList
                              .map((v) => String(v))
                              .join(', ');
                            contents.push({
                              value: `**Required:** ${rendered}`,

                              isTrusted: true,
                            });
                          }
                          // Add content preview
                          try {
                            const jsonPreview = JSON.stringify(
                              schema.content,
                              null,
                              2,
                            );
                            const truncated =
                              jsonPreview.length > 4000
                                ? jsonPreview.slice(0, 4000) + '\n...'
                                : jsonPreview;
                            contents.push({ value: '---', isTrusted: true });
                            contents.push({
                              value: '**Content:**',
                              isTrusted: true,
                            });
                            contents.push({
                              value: `\`\`\`json\n${truncated}\n\`\`\``,
                              isTrusted: true,
                            });
                          } catch {
                            // no-op
                          }
                        } else {
                          contents.push({
                            value:
                              '**Note:** Schema content not loaded in memory',
                            isTrusted: true,
                          });
                        }

                        contents.push({
                          value: '---',
                          isTrusted: true,
                        });
                        contents.push({
                          value:
                            '**Actions:** Press `Ctrl/Cmd + F12` to navigate to this schema',
                          isTrusted: true,
                        });

                        return {
                          contents,
                          range: {
                            startLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endLineNumber: position.lineNumber,
                            endColumn: word.endColumn,
                          },
                        };
                      } catch {
                        // Fallback if file reading fails
                        return {
                          contents: [
                            {
                              value: `**Schema Reference:** \`${refPath}\``,
                              isTrusted: true,
                            },
                            {
                              value: `**Schema Name:** ${schema.name}`,
                              isTrusted: true,
                            },
                            {
                              value: `**Schema Path:** \`${schema.path}\``,
                              isTrusted: true,
                            },
                            {
                              value: '**Note:** Unable to read schema content',
                              isTrusted: true,
                            },
                          ],
                          range: {
                            startLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endLineNumber: position.lineNumber,
                            endColumn: word.endColumn,
                          },
                        };
                      }
                    }
                  }

                  // JSON Schema hover information (single provider only)
                  const getJsonSchemaHoverInfo = (
                    keyword: string,
                    _value: string,
                  ) => {
                    interface HoverInfoEntry {
                      title: string;
                      description: string;
                      examples?: Record<string, string>;
                    }
                    const hoverInfo: Record<
                      string,
                      {
                        title: string;
                        description: string;
                        examples?: Record<string, string>;
                      }
                    > = {
                      type: {
                        title: 'JSON Schema Type',
                        description: 'Defines the data type of the schema',
                        examples: {
                          string: 'Text values',
                          number: 'Numeric values (integer or float)',
                          integer: 'Whole numbers only',
                          boolean: 'True or false values',
                          object: 'Key-value pairs',
                          array: 'Ordered list of values',
                          null: 'Null value',
                        },
                      },
                      title: {
                        title: 'Schema Title',
                        description: 'Human-readable title for the schema',
                      },
                      description: {
                        title: 'Schema Description',
                        description:
                          'Detailed description of the schema purpose',
                      },
                      required: {
                        title: 'Required Properties',
                        description:
                          'Array of property names that must be present',
                      },
                      properties: {
                        title: 'Schema Properties',
                        description:
                          'Defines the properties of an object schema',
                      },
                      items: {
                        title: 'Array Items',
                        description: 'Defines the schema for array elements',
                      },
                      enum: {
                        title: 'Enumeration',
                        description:
                          'Restricts values to a specific set of options',
                      },
                      const: {
                        title: 'Constant Value',
                        description:
                          'The value must exactly match this constant',
                      },
                      format: {
                        title: 'String Format',
                        description: 'Specifies the format of string values',
                        examples: {
                          date: 'YYYY-MM-DD format',
                          'date-time': 'ISO 8601 datetime format',
                          email: 'Valid email address',
                          uri: 'Valid URI/URL',
                          uuid: 'UUID format',
                          ipv4: 'IPv4 address',
                          ipv6: 'IPv6 address',
                        },
                      },
                      pattern: {
                        title: 'Regular Expression Pattern',
                        description: 'String must match this regex pattern',
                      },
                      minimum: {
                        title: 'Minimum Value',
                        description: 'Numeric value must be >= this value',
                      },
                      maximum: {
                        title: 'Maximum Value',
                        description: 'Numeric value must be <= this value',
                      },
                      minLength: {
                        title: 'Minimum Length',
                        description:
                          'String must have at least this many characters',
                      },
                      maxLength: {
                        title: 'Maximum Length',
                        description:
                          'String must have at most this many characters',
                      },
                      minItems: {
                        title: 'Minimum Items',
                        description:
                          'Array must have at least this many elements',
                      },
                      maxItems: {
                        title: 'Maximum Items',
                        description:
                          'Array must have at most this many elements',
                      },
                      uniqueItems: {
                        title: 'Unique Items',
                        description: 'All array elements must be unique',
                      },
                      additionalProperties: {
                        title: 'Additional Properties',
                        description:
                          'Whether to allow properties not defined in schema',
                      },
                      allOf: {
                        title: 'All Of',
                        description:
                          'Value must validate against ALL of these schemas',
                      },
                      anyOf: {
                        title: 'Any Of',
                        description:
                          'Value must validate against AT LEAST ONE of these schemas',
                      },
                      oneOf: {
                        title: 'One Of',
                        description:
                          'Value must validate against EXACTLY ONE of these schemas',
                      },
                      not: {
                        title: 'Not',
                        description:
                          'Value must NOT validate against this schema',
                      },
                      if: {
                        title: 'If Condition',
                        description:
                          'Conditional validation - if this schema validates, then...',
                      },
                      then: {
                        title: 'Then',
                        description:
                          'If the "if" schema validates, then this schema must also validate',
                      },
                      else: {
                        title: 'Else',
                        description:
                          'If the "if" schema does not validate, then this schema must validate',
                      },
                      default: {
                        title: 'Default Value',
                        description:
                          'Default value when property is not provided',
                      },
                      examples: {
                        title: 'Examples',
                        description:
                          'Sample values that are valid for this schema',
                      },
                      deprecated: {
                        title: 'Deprecated',
                        description: 'Indicates this property is deprecated',
                      },
                      readOnly: {
                        title: 'Read Only',
                        description:
                          'Property should not be modified by clients',
                      },
                      writeOnly: {
                        title: 'Write Only',
                        description:
                          'Property should not be returned by servers',
                      },
                    };

                    return hoverInfo[keyword] || null;
                  };

                  // Check for JSON Schema keywords (no duplicate providers)
                  const keywordMatch = lineContent.match(
                    /"([^"]+)"\s*:\s*([^,\s]+)/,
                  );
                  if (keywordMatch && word.word === keywordMatch[1]) {
                    const keyword = keywordMatch[1];
                    const info = getJsonSchemaHoverInfo(
                      keyword,
                      keywordMatch[2],
                    );

                    if (info) {
                      const contents: Array<{
                        value: string;
                        isTrusted: boolean;
                      }> = [
                        {
                          value: `**${info.title}:** \`${keyword}\``,
                          isTrusted: true,
                        },
                        {
                          value: info.description,
                          isTrusted: true,
                        },
                      ];

                      if (info.examples) {
                        contents.push({
                          value: '---',
                          isTrusted: true,
                        });
                        contents.push({
                          value: '**Common Values:**',
                          isTrusted: true,
                        });
                        Object.entries(info.examples).forEach(
                          ([example, description]) => {
                            contents.push({
                              value: `- \`${example}\`: ${description}`,
                              isTrusted: true,
                            });
                          },
                        );
                      }

                      return {
                        contents,
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: word.startColumn,
                          endLineNumber: position.lineNumber,
                          endColumn: word.endColumn,
                        },
                      };
                    }
                  }

                  // Check if we're on a property name (object property)
                  const propertyMatch = lineContent.match(/"([^"]+)":\s*{/);
                  if (propertyMatch && word.word === propertyMatch[1]) {
                    return {
                      contents: [
                        {
                          value: `**Property:** \`${word.word}\``,
                          isTrusted: true,
                        },
                        {
                          value: 'JSON Schema property definition',
                          isTrusted: true,
                        },
                        {
                          value: '---',
                          isTrusted: true,
                        },
                        {
                          value:
                            '**Usage:** This property will be validated according to its nested schema definition.',
                          isTrusted: true,
                        },
                      ],
                      range: {
                        startLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endLineNumber: position.lineNumber,
                        endColumn: word.endColumn,
                      },
                    };
                  }

                  // Check if we're on a type value
                  const typeMatch = lineContent.match(/"type"\s*:\s*"([^"]+)"/);
                  if (typeMatch && word.word === typeMatch[1]) {
                    const typeInfo = getJsonSchemaHoverInfo('type', word.word);
                    const examples = typeInfo?.examples || {};

                    return {
                      contents: [
                        {
                          value: `**Type:** \`${word.word}\``,
                          isTrusted: true,
                        },
                        {
                          value:
                            typeInfo?.description || 'JSON Schema data type',
                          isTrusted: true,
                        },
                        {
                          value: '---',
                          isTrusted: true,
                        },
                        {
                          value: '**Description:**',
                          isTrusted: true,
                        },
                        {
                          value:
                            examples[word.word] ||
                            'Defines the data type for validation',
                          isTrusted: true,
                        },
                      ],
                      range: {
                        startLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endLineNumber: position.lineNumber,
                        endColumn: word.endColumn,
                      },
                    };
                  }

                  // Check for format values
                  const formatMatch = lineContent.match(
                    /"format"\s*:\s*"([^"]+)"/,
                  );
                  if (formatMatch && word.word === formatMatch[1]) {
                    const formatInfo = getJsonSchemaHoverInfo(
                      'format',
                      word.word,
                    );
                    const examples = formatInfo?.examples || {};

                    return {
                      contents: [
                        {
                          value: `**Format:** \`${word.word}\``,
                          isTrusted: true,
                        },
                        {
                          value:
                            formatInfo?.description ||
                            'String format specification',
                          isTrusted: true,
                        },
                        {
                          value: '---',
                          isTrusted: true,
                        },
                        {
                          value: '**Description:**',
                          isTrusted: true,
                        },
                        {
                          value:
                            examples[word.word] ||
                            'Specifies the expected format of the string',
                          isTrusted: true,
                        },
                      ],
                      range: {
                        startLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endLineNumber: position.lineNumber,
                        endColumn: word.endColumn,
                      },
                    };
                  }

                  return null;
                },
              });
          }

          // Navigation (F12)
          if (onRefClick) {
            editor.addAction({
              id: 'navigate-to-ref',
              label: 'Navigate to Reference',
              keybindings: [
                monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.F12,
              ],
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
                const markers = monacoInstance.editor.getModelMarkers({
                  resource: model.uri,
                });
                const errors: ValidationError[] = markers.map((marker) => ({
                  line: marker.startLineNumber,
                  column: marker.startColumn,
                  message: marker.message,
                  severity:
                    marker.severity === monacoInstance.MarkerSeverity.Error
                      ? 'error'
                      : marker.severity ===
                          monacoInstance.MarkerSeverity.Warning
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
          hover: {
            enabled: true,
            delay: 300,
            sticky: true,
            above: true,
          },
        });

        editor.addAction({
          id: 'format-document',
          label: 'Format Document',
          keybindings: [
            monacoInstance.KeyMod.Shift |
              monacoInstance.KeyMod.Alt |
              monacoInstance.KeyCode.KeyF,
          ],
          contextMenuGroupId: 'modification',
          run: () => {
            editor.getAction('editor.action.formatDocument')?.run();
          },
        });

        // Keyboard shortcuts (Save / Save All)
        editor.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
          () => {
            try {
              onSave?.();
            } catch (e) {
              logger.error('onSave handler failed', { error: e });
            }
          },
        );

        editor.addCommand(
          monacoInstance.KeyMod.CtrlCmd |
            monacoInstance.KeyMod.Shift |
            monacoInstance.KeyCode.KeyS,
          () => {
            try {
              onSaveAll?.();
            } catch (e) {
              logger.error('onSaveAll handler failed', { error: e });
            }
          },
        );

        editor.addAction({
          id: 'validate-json',
          label: 'Validate JSON',
          keybindings: [
            monacoInstance.KeyMod.CtrlCmd |
              monacoInstance.KeyMod.Shift |
              monacoInstance.KeyCode.KeyV,
          ],
          contextMenuGroupId: 'modification',
          run: () => {
            try {
              const content = editor.getValue();
              JSON.parse(content);
              logger.info('JSON validation successful');
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Invalid JSON syntax';
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
          if (hoverProviderRef.current) {
            hoverProviderRef.current.dispose();
            hoverProviderRef.current = null;
          }
        };

        return cleanup;
      },
    ),
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

  const formatDocument = React.useCallback(async () => {
    if (editorRef.current) {
      try {
        await editorRef.current
          .getAction('editor.action.formatDocument')
          ?.run();
      } catch (e) {
        logger.warn('Monaco formatDocument failed', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
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
      return position
        ? { line: position.lineNumber, column: position.column }
        : null;
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

  const getValue = React.useCallback(() => {
    if (editorRef.current) {
      return editorRef.current.getValue();
    }
    return value; // Fallback to prop value
  }, [value]);

  React.useImperativeHandle(
    ref,
    () => ({
      formatDocument,
      validateJson,
      getCursorPosition,
      goToPosition,
      getValue,
    }),
    [formatDocument, validateJson, getCursorPosition, goToPosition, getValue],
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
    <div className="relative w-full h-full overflow-visible" style={{ height }}>
      <ErrorBoundary>
        <MonacoEditorReact
          value={value}
          language={language}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          height={height}
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
                <p className="text-sm text-muted-foreground">
                  Loading editor...
                </p>
              </div>
            </div>
          }
        />
      </ErrorBoundary>
    </div>
  );
});

export default MonacoEditor;
