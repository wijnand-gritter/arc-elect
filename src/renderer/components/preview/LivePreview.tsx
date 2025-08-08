/**
 * Live Preview component for JSON Schema visualization.
 *
 * This component provides real-time preview of JSON schemas with:
 * - Sample data generation
 * - Multiple preview modes (tree, form, example)
 * - Schema structure visualization
 * - Interactive preview configuration
 *
 * @module LivePreview
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Eye,
  Code,
  TreePine,
  FileText,
  Shuffle,
  Copy,
  Download,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import logger from '../../lib/renderer-logger';
import { safeHandler } from '../../lib/error-handling';

/**
 * Interface for Live Preview component props.
 */
interface LivePreviewProps {
  /** JSON schema content to preview */
  schemaContent: string;
  /** Schema name for display */
  schemaName: string;
  /** Whether the schema content is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors?: Array<{ message: string; line?: number; column?: number }>;
}

/**
 * Preview mode types.
 */
type PreviewMode = 'tree' | 'form' | 'example' | 'structure';

/**
 * JSON Schema type definition.
 */
type JSONSchema = {
  type?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  enum?: unknown[];
  format?: string;
  example?: unknown;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  required?: string[];
  description?: string;
};

/**
 * Sample data generator for JSON schemas.
 */
class SampleDataGenerator {
  /**
   * Generate sample data from JSON schema.
   */
  static generateSample(schema: JSONSchema, depth = 0): unknown {
    if (depth > 10) return null; // Prevent infinite recursion

    try {
      if (!schema || typeof schema !== 'object') return null;

      // Handle different schema types
      switch (schema.type) {
        case 'string':
          return this.generateString(schema);
        case 'number':
        case 'integer':
          return this.generateNumber(schema);
        case 'boolean':
          return Math.random() > 0.5;
        case 'array':
          return this.generateArray(schema, depth);
        case 'object':
          return this.generateObject(schema, depth);
        case 'null':
          return null;
        default:
          // If no type specified, try to infer from properties
          if (schema.properties) {
            return this.generateObject(schema, depth);
          }
          if (schema.items) {
            return this.generateArray(schema, depth);
          }
          return null;
      }
    } catch (error) {
      logger.error('Sample data generation failed', { error, schema });
      return null;
    }
  }

  private static generateString(schema: JSONSchema): string {
    if (schema.enum) {
      return String(
        schema.enum[Math.floor(Math.random() * schema.enum.length)],
      );
    }
    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return 'user@example.com';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'date-time':
          return new Date().toISOString();
        case 'uri':
          return 'https://example.com';
        case 'uuid':
          return '123e4567-e89b-12d3-a456-426614174000';
        default:
          return String(schema.example) || 'sample text';
      }
    }
    return String(schema.example || schema.default) || 'sample text';
  }

  private static generateNumber(schema: JSONSchema): number {
    if (schema.enum) {
      return Number(
        schema.enum[Math.floor(Math.random() * schema.enum.length)],
      );
    }
    const min = schema.minimum || 0;
    const max = schema.maximum || 100;
    const value = Math.random() * (max - min) + min;
    return schema.type === 'integer' ? Math.floor(value) : value;
  }

  private static generateArray(schema: JSONSchema, depth: number): unknown[] {
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 3;
    const length =
      Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;

    const items = [];
    if (schema.items) {
      for (let i = 0; i < length; i++) {
        const item = this.generateSample(schema.items, depth + 1);
        if (item !== null) {
          items.push(item);
        }
      }
    }
    return items;
  }

  private static generateObject(
    schema: JSONSchema,
    depth: number,
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    if (schema.properties) {
      const required = schema.required || [];

      // Add required properties
      for (const key of required) {
        if (schema.properties[key]) {
          const value = this.generateSample(schema.properties[key], depth + 1);
          if (value !== null) {
            obj[key] = value;
          }
        }
      }

      // Add some optional properties (50% chance each)
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!required.includes(key) && Math.random() > 0.5) {
          const value = this.generateSample(
            propSchema as JSONSchema,
            depth + 1,
          );
          if (value !== null) {
            obj[key] = value;
          }
        }
      }
    }

    return obj;
  }
}

/**
 * Live Preview component.
 */
export function LivePreview({
  schemaContent,
  schemaName,
  isValid,
  errors = [],
}: LivePreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('example');
  const [sampleData, setSampleData] = useState<unknown>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Parse schema
  const parsedSchema = useMemo(() => {
    if (!isValid || !schemaContent) return null;
    try {
      return JSON.parse(schemaContent) as JSONSchema;
    } catch (_error) {
      return null;
    }
  }, [schemaContent, isValid]);

  // Generate sample data
  const generateSampleData = useCallback(
    safeHandler(async () => {
      if (!parsedSchema) {
        toast.error('Invalid schema - cannot generate sample data');
        return;
      }

      setIsGenerating(true);
      try {
        const sample = SampleDataGenerator.generateSample(parsedSchema);
        setSampleData(sample);
        toast.success('Sample data generated successfully');
        logger.info('Sample data generated', { schemaName, sample });
      } catch (error) {
        logger.error('Sample data generation failed', { error, schemaName });
        toast.error('Failed to generate sample data');
      } finally {
        setIsGenerating(false);
      }
    }),
    [parsedSchema, schemaName],
  );

  // Copy to clipboard
  const copyToClipboard = useCallback(
    safeHandler(async (content: string) => {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    }),
    [],
  );

  // Download as file
  const downloadAsFile = useCallback(
    safeHandler((content: string, filename: string) => {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    }),
    [],
  );

  // Render schema structure
  const renderSchemaStructure = (
    schema: JSONSchema,
    depth = 0,
  ): React.ReactNode => {
    if (!schema || depth > 5) return null;

    const indent = '  '.repeat(depth);

    if (schema.type === 'object' && schema.properties) {
      return (
        <div className="font-mono text-sm">
          <div>
            {indent}
            {'{'}
          </div>
          {Object.entries(schema.properties).map(
            ([key, prop]: [string, JSONSchema]) => (
              <div key={key} className="ml-4">
                <span className="text-blue-600">"{key}"</span>:
                <span className="text-green-600 ml-1">
                  {prop.type || 'any'}
                </span>
                {prop.description && (
                  <span className="text-muted-foreground ml-2">
                    // {prop.description}
                  </span>
                )}
                {prop.type === 'object' && prop.properties && (
                  <div className="ml-4">
                    {renderSchemaStructure(prop, depth + 1)}
                  </div>
                )}
              </div>
            ),
          )}
          <div>
            {indent}
            {'}'}
          </div>
        </div>
      );
    }

    if (schema.type === 'array' && schema.items) {
      return (
        <div className="font-mono text-sm">
          <div>{indent}[</div>
          <div className="ml-4">
            {renderSchemaStructure(schema.items, depth + 1)}
          </div>
          <div>{indent}]</div>
        </div>
      );
    }

    return <span className="text-green-600">{schema.type || 'any'}</span>;
  };

  if (!isValid) {
    return (
      <Card className="glass-blue border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Preview Unavailable
          </CardTitle>
          <CardDescription>
            Cannot preview schema due to validation errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-destructive">
                {error.line && error.column
                  ? `Line ${error.line}, Column ${error.column}: `
                  : ''}
                {error.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-blue border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Live Preview
            </CardTitle>
            <CardDescription>{schemaName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateSampleData}
              disabled={isGenerating || !parsedSchema}
            >
              {isGenerating ? (
                <Shuffle className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Shuffle className="w-3 h-3 mr-1" />
              )}
              Generate
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={previewMode}
          onValueChange={(value) => setPreviewMode(value as PreviewMode)}
        >
          <div className="px-6 pb-3">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="example" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Example
              </TabsTrigger>
              <TabsTrigger value="structure" className="text-xs">
                <TreePine className="w-3 h-3 mr-1" />
                Structure
              </TabsTrigger>
              <TabsTrigger value="form" className="text-xs">
                <Code className="w-3 h-3 mr-1" />
                Form
              </TabsTrigger>
              <TabsTrigger value="tree" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Tree
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px] px-6 pb-6">
            <TabsContent value="example" className="mt-0">
              {sampleData ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Generated
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(sampleData, null, 2))
                      }
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        downloadAsFile(
                          JSON.stringify(sampleData, null, 2),
                          `${schemaName}-sample.json`,
                        )
                      }
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                  <pre className="bg-muted/30 p-4 rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(sampleData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No sample data generated yet
                  </p>
                  <Button onClick={generateSampleData} disabled={isGenerating}>
                    <Shuffle className="w-4 h-4 mr-2" />
                    Generate Sample Data
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="structure" className="mt-0">
              {parsedSchema ? (
                <div className="bg-muted/30 p-4 rounded-md">
                  {renderSchemaStructure(parsedSchema)}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Invalid schema structure
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="mt-0">
              <div className="text-center py-8">
                <Code className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Form preview coming soon
                </p>
              </div>
            </TabsContent>

            <TabsContent value="tree" className="mt-0">
              <div className="text-center py-8">
                <TreePine className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Tree view coming soon
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
