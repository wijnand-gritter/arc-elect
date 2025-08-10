import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
// tabs removed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// tooltip removed
import {
  Search,
  FileText,
  Copy,
  Hash,
  Box,
  GitCompare,
  Settings,
} from 'lucide-react';
import type {
  ConversionReport as ConversionReportType,
  ConversionSummary,
} from '../../../types/raml-import';
import logger from '../../lib/renderer-logger';

interface ConversionReportProps {
  summary: ConversionSummary;
  reports: ConversionReportType[];
}

interface TransformationStats {
  totalProperties: number;
  formatsAdded: number;
  typesChanged: number;
  unionsConverted: number;
  enumsExtracted: number;
  namingChanges: number;
}

const ConversionReport: React.FC<ConversionReportProps> = ({
  summary,
  reports,
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  // Single view (formerly comparison) — tabs removed per requirement

  // Only one conversion diff mounted at a time to avoid Monaco listener leaks
  const [selectedConversion, setSelectedConversion] = useState<{
    reportIndex: number;
    schemaIndex: number;
  } | null>(null);
  const diffEditorRef = useRef<any>(null);
  const [openTransforms, setOpenTransforms] = useState<{
    reportIndex: number;
    schemaIndex: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      // Dispose diff editor instance on unmount/selection change
      try {
        if (
          diffEditorRef.current &&
          typeof diffEditorRef.current.dispose === 'function'
        ) {
          diffEditorRef.current.dispose();
        }
      } catch {
        // ignore
      }
    };
  }, [selectedConversion]);

  // Calculate transformation statistics
  const _transformationStats = useMemo((): TransformationStats => {
    let totalProperties = 0;
    let formatsAdded = 0;
    let typesChanged = 0;
    let unionsConverted = 0;
    let enumsExtracted = 0;
    let namingChanges = 0;

    reports.forEach((report) => {
      totalProperties += report.propertyTransformations?.length || 0;
      formatsAdded += report.formatInferences?.length || 0;
      typesChanged +=
        report.propertyTransformations?.filter(
          (p) => p.originalType !== p.convertedType,
        ).length || 0;
      unionsConverted += report.unionConversions?.length || 0;
      enumsExtracted += report.inlineEnumExtractions?.length || 0;
      namingChanges += report.namingChanges?.length || 0;
    });

    return {
      totalProperties,
      formatsAdded,
      typesChanged,
      unionsConverted,
      enumsExtracted,
      namingChanges,
    };
  }, [reports]);

  const getTransformationColor = (type: string) => {
    switch (type) {
      case 'format-added':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'type-changed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'property-renamed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'union-converted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'enum-extracted':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logger.info('Content copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy to clipboard', { error });
    }
  }, []);

  // exports removed per request

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b" />

      {/* Overview removed */}
      {/* Combined single view (Source Comparison + Transformations) */}
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                RAML to JSON Schema Conversions
              </h2>
              <p className="text-muted-foreground">
                View the transformation from RAML types to JSON Schema files
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          <div className="space-y-4">
            {reports.map((report, reportIndex) => {
              if (!report.originalRamlContent || !report.generatedSchemas)
                return null;

              const filteredSchemas = report.generatedSchemas.filter(
                (schema) =>
                  searchTerm === '' ||
                  schema.fileName
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  report.inputFile
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()),
              );

              if (filteredSchemas.length === 0) return null;

              return (
                <Card key={reportIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <CardTitle className="text-lg">
                            {report.inputFile?.split('/').pop() ||
                              `RAML File ${reportIndex + 1}`}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Generated {filteredSchemas.length} JSON Schema file
                            {filteredSchemas.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {
                          filteredSchemas.filter((s) => s.type === 'enum')
                            .length
                        }{' '}
                        Enums,{' '}
                        {
                          filteredSchemas.filter(
                            (s) => s.type === 'business-object',
                          ).length
                        }{' '}
                        Business Objects
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {filteredSchemas.map((schema, schemaIndex) => (
                      <div
                        key={schemaIndex}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-xs">
                              RAML Input
                            </span>
                            {schema.type === 'enum' ? (
                              <Hash className="h-4 w-4 text-green-500" />
                            ) : (
                              <Box className="h-4 w-4 text-purple-500" />
                            )}
                            <span className="font-medium text-sm truncate">
                              {schema.fileName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {schema.type === 'enum'
                                ? 'Enum'
                                : 'Business Object'}
                            </Badge>
                          </div>
                          <div className="flex gap-2 md:ml-auto self-end md:self-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copyToClipboard(report.originalRamlContent!)
                              }
                            >
                              <Copy className="h-3 w-3 mr-1" /> RAML
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(schema.content)}
                            >
                              <Copy className="h-3 w-3 mr-1" /> JSON
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                setSelectedConversion((prev) =>
                                  prev?.reportIndex === reportIndex &&
                                  prev?.schemaIndex === schemaIndex
                                    ? null
                                    : { reportIndex, schemaIndex },
                                )
                              }
                            >
                              {selectedConversion?.reportIndex ===
                                reportIndex &&
                              selectedConversion?.schemaIndex === schemaIndex
                                ? 'Hide Diff'
                                : 'Show Diff'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setOpenTransforms((prev) =>
                                  prev?.reportIndex === reportIndex &&
                                  prev?.schemaIndex === schemaIndex
                                    ? null
                                    : { reportIndex, schemaIndex },
                                )
                              }
                            >
                              {openTransforms?.reportIndex === reportIndex &&
                              openTransforms?.schemaIndex === schemaIndex
                                ? 'Hide Transformations'
                                : 'Transformations'}
                            </Button>
                          </div>
                        </div>

                        {selectedConversion?.reportIndex === reportIndex &&
                          selectedConversion?.schemaIndex === schemaIndex && (
                            <div className="h-96">
                              <DiffEditor
                                height="100%"
                                language="yaml"
                                original={report.originalRamlContent || ''}
                                modified={schema.content}
                                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                                onMount={(editor) => {
                                  diffEditorRef.current = editor;
                                }}
                                options={{
                                  renderSideBySide: true,
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  wordWrap: 'on',
                                  scrollBeyondLastLine: false,
                                  fontSize: 12,
                                  lineNumbers: 'on',
                                  folding: true,
                                  automaticLayout: true,
                                }}
                              />
                            </div>
                          )}

                        {/* Collapsible transformations for this schema (outside diff) */}
                        {openTransforms?.reportIndex === reportIndex &&
                          openTransforms?.schemaIndex === schemaIndex && (
                            <div className="p-4 space-y-4">
                              {/* Property Transformations for this schema */}
                              {report.propertyTransformations &&
                                report.propertyTransformations.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <GitCompare className="h-4 w-4" />
                                      Property Transformations
                                    </h4>
                                    <Accordion
                                      type="multiple"
                                      className="w-full"
                                    >
                                      {report.propertyTransformations.map(
                                        (transform, i) => (
                                          <AccordionItem
                                            key={i}
                                            value={`schema-${schemaIndex}-transform-${i}`}
                                          >
                                            <AccordionTrigger className="text-left">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <Badge
                                                  variant="outline"
                                                  className="shrink-0"
                                                >
                                                  {transform.propertyName}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground truncate">
                                                  {transform.originalType} →{' '}
                                                  {transform.convertedType}
                                                </span>
                                                {transform.format && (
                                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    {transform.format}
                                                  </Badge>
                                                )}
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                                                {transform.originalDescription && (
                                                  <div>
                                                    <strong>
                                                      Description:
                                                    </strong>{' '}
                                                    {
                                                      transform.originalDescription
                                                    }
                                                  </div>
                                                )}
                                                {transform.lineNumber !==
                                                  undefined && (
                                                  <div>
                                                    <strong>Line:</strong>{' '}
                                                    {transform.lineNumber}
                                                  </div>
                                                )}
                                                {transform.formatReason && (
                                                  <div className="md:col-span-2">
                                                    <strong>
                                                      Format Reason:
                                                    </strong>{' '}
                                                    {transform.formatReason}
                                                  </div>
                                                )}
                                                {transform.typeReason && (
                                                  <div className="md:col-span-2">
                                                    <strong>
                                                      Type Reason:
                                                    </strong>{' '}
                                                    {transform.typeReason}
                                                  </div>
                                                )}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        ),
                                      )}
                                    </Accordion>
                                  </div>
                                )}

                              {/* Union Conversions */}
                              {report.unionConversions &&
                                report.unionConversions.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <GitCompare className="h-4 w-4" />
                                      Union Conversions
                                    </h4>
                                    <div className="space-y-2">
                                      {report.unionConversions.map(
                                        (union, i) => (
                                          <div
                                            key={i}
                                            className="p-3 border rounded-lg text-sm"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                Union
                                              </Badge>
                                              {union.lineNumber && (
                                                <span>
                                                  Line {union.lineNumber}
                                                </span>
                                              )}
                                            </div>
                                            <div>
                                              <strong>Original:</strong>{' '}
                                              {union.original}
                                            </div>
                                            <div>
                                              <strong>Strategy:</strong>{' '}
                                              {union.strategy}
                                            </div>
                                            <div>
                                              <strong>Types:</strong>{' '}
                                              {union.converted.join(', ')}
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Format Inferences */}
                              {report.formatInferences &&
                                report.formatInferences.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Settings className="h-4 w-4" />
                                      Format Inferences
                                    </h4>
                                    <div className="space-y-2">
                                      {report.formatInferences.map(
                                        (inference, i) => (
                                          <div
                                            key={i}
                                            className="p-3 border rounded-lg text-sm"
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline">
                                                {inference.property}
                                              </Badge>
                                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                {inference.format}
                                              </Badge>
                                              {inference.confidence !==
                                                undefined && (
                                                <span className="text-muted-foreground">
                                                  {inference.confidence}%
                                                </span>
                                              )}
                                            </div>
                                            <div>
                                              <strong>Original Type:</strong>{' '}
                                              {inference.originalType}
                                            </div>
                                            {inference.reason && (
                                              <div>
                                                <strong>Reason:</strong>{' '}
                                                {inference.reason}
                                              </div>
                                            )}
                                            {inference.parentType && (
                                              <div>
                                                <strong>Parent:</strong>{' '}
                                                {inference.parentType}
                                              </div>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Naming Changes */}
                              {report.namingChanges &&
                                report.namingChanges.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Naming Changes
                                    </h4>
                                    <div className="space-y-2">
                                      {report.namingChanges.map((change, i) => (
                                        <div
                                          key={i}
                                          className="p-3 border rounded-lg text-sm"
                                        >
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                              {change.scope}
                                            </Badge>
                                          </div>
                                          <div>
                                            <strong>Original:</strong>{' '}
                                            {change.original}
                                          </div>
                                          <div>
                                            <strong>New:</strong>{' '}
                                            {change.converted}
                                          </div>
                                          {change.context && (
                                            <div>
                                              <strong>Context:</strong>{' '}
                                              {change.context}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {reports.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold">No conversions available</h3>
                  <p className="text-sm text-muted-foreground">
                    Run a RAML to JSON Schema conversion to see the results
                    here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversionReport;
export { ConversionReport };
