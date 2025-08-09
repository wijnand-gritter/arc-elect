import React, { useState } from 'react';
import type {
  ConversionReport as ConversionReportType,
  ConversionSummary,
} from '../../../types/raml-import';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  File,
  ArrowRight,
  Code,
  FileText,
  Settings,
  CheckCircle,
  Copy,
} from 'lucide-react';

interface Props {
  summary?: ConversionSummary | undefined;
  reports?: ConversionReportType[] | undefined;
}

export function ConversionReport({
  summary,
  reports,
}: Props): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithTransformations, setShowOnlyWithTransformations] =
    useState(false);

  const filteredReports =
    reports?.filter((report) => {
      const matchesSearch =
        !searchTerm ||
        report.inputFile.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fileMapping?.ramlHeader?.title
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const hasTransformations =
        (report.propertyTransformations?.length || 0) > 0 ||
        (report.unionConversions?.length || 0) > 0 ||
        (report.inlineEnumExtractions?.length || 0) > 0 ||
        (report.formatInferences?.length || 0) > 0;

      return (
        matchesSearch && (!showOnlyWithTransformations || hasTransformations)
      );
    }) || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conversion Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <div className="text-sm text-muted-foreground">
              No summary available.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {summary.filesProcessed}
                </div>
                <div className="text-sm text-muted-foreground">
                  Files Processed
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {summary.enumsCreated + summary.businessObjectsCreated}
                </div>
                <div className="text-sm text-muted-foreground">
                  Schemas Created
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.unionsCount + summary.inlineEnumsExtracted}
                </div>
                <div className="text-sm text-muted-foreground">
                  Transformations
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-muted-foreground">
                  {summary.durationMs}ms
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by file name or RAML title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={showOnlyWithTransformations ? 'default' : 'outline'}
              onClick={() =>
                setShowOnlyWithTransformations(!showOnlyWithTransformations)
              }
            >
              Show Only Transformed
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredReports.length} of {reports?.length || 0} files
          </div>
        </CardContent>
      </Card>

      {/* File Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Detailed Transformation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {reports?.length === 0
                ? 'No conversion reports available.'
                : 'No files match your filters.'}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Accordion type="single" collapsible className="space-y-4">
                {filteredReports.map((report, idx) => (
                  <AccordionItem
                    key={`${report.inputFile}-${idx}`}
                    value={`file-${idx}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="flex items-center gap-3">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <div className="font-medium truncate max-w-[300px]">
                              {report.inputFile.split('/').pop()}
                            </div>
                            {report.fileMapping?.ramlHeader?.title && (
                              <div className="text-sm text-muted-foreground">
                                {report.fileMapping.ramlHeader.title}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {report.enumsWritten.length +
                              report.businessObjectsWritten.length}{' '}
                            schemas
                          </Badge>
                          {(report.propertyTransformations?.length || 0) >
                            0 && (
                            <Badge variant="secondary">
                              {report.propertyTransformations?.length} props
                            </Badge>
                          )}
                          {(report.formatInferences?.length || 0) > 0 && (
                            <Badge variant="default">
                              {report.formatInferences?.length} formats
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <Tabs defaultValue="outputs" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="outputs">
                            Output Files
                          </TabsTrigger>
                          <TabsTrigger value="properties">
                            Property Details
                          </TabsTrigger>
                          <TabsTrigger value="transformations">
                            Transformations
                          </TabsTrigger>
                          <TabsTrigger value="formats">
                            Format Inferences
                          </TabsTrigger>
                          <TabsTrigger value="comparison">
                            Source Comparison
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="outputs" className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.enumsWritten.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  Enums ({report.enumsWritten.length})
                                </h4>
                                <div className="space-y-1">
                                  {report.enumsWritten.map((e, i) => (
                                    <div
                                      key={i}
                                      className="text-sm p-2 bg-muted/30 rounded flex items-center justify-between"
                                    >
                                      <span className="font-mono">
                                        {e.name}
                                      </span>
                                      {e.file && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(e.file!)
                                          }
                                          title="Copy file path"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.businessObjectsWritten.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                  Business Objects (
                                  {report.businessObjectsWritten.length})
                                </h4>
                                <div className="space-y-1">
                                  {report.businessObjectsWritten.map(
                                    (bo, i) => (
                                      <div
                                        key={i}
                                        className="text-sm p-2 bg-muted/30 rounded flex items-center justify-between"
                                      >
                                        <span className="font-mono">
                                          {bo.name}
                                        </span>
                                        {bo.file && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              copyToClipboard(bo.file!)
                                            }
                                            title="Copy file path"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="properties" className="space-y-3">
                          {!report.propertyTransformations ||
                          report.propertyTransformations.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No property transformations recorded for this file
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">
                                Shows how each RAML property was converted to
                                JSON Schema
                              </div>
                              {report.propertyTransformations.map((prop, i) => (
                                <div
                                  key={i}
                                  className="border rounded-lg p-4 space-y-2"
                                >
                                  <div className="flex items-center gap-2 font-medium">
                                    <Code className="h-4 w-4" />
                                    {prop.parentType}.{prop.propertyName}
                                    {prop.isOptional && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        optional
                                      </Badge>
                                    )}
                                  </div>
                                  {prop.originalRamlLine && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Original RAML:
                                      </div>
                                      <div className="bg-muted/30 p-2 rounded text-sm font-mono whitespace-pre-wrap">
                                        {prop.originalRamlLine}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline">
                                      {prop.originalType || 'unknown'}
                                    </Badge>
                                    <ArrowRight className="h-3 w-3" />
                                    <Badge variant="secondary">
                                      {Array.isArray(prop.convertedType)
                                        ? prop.convertedType.join(' | ')
                                        : prop.convertedType || 'unknown'}
                                    </Badge>
                                    {prop.format && (
                                      <Badge variant="default">
                                        format: {prop.format}
                                      </Badge>
                                    )}
                                    {prop.$ref && (
                                      <Badge variant="default">$ref</Badge>
                                    )}
                                  </div>
                                  {(prop.formatReason || prop.typeReason) && (
                                    <div className="text-xs text-muted-foreground">
                                      {prop.formatReason && (
                                        <div>• {prop.formatReason}</div>
                                      )}
                                      {prop.typeReason && (
                                        <div>• {prop.typeReason}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent
                          value="transformations"
                          className="space-y-3"
                        >
                          {(!report.unionConversions ||
                            report.unionConversions.length === 0) &&
                          (!report.inlineEnumExtractions ||
                            report.inlineEnumExtractions.length === 0) &&
                          (!report.namingChanges ||
                            report.namingChanges.length === 0) ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No special transformations recorded for this file
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-sm text-muted-foreground">
                                Advanced transformations applied during
                                conversion
                              </div>

                              {report.unionConversions &&
                                report.unionConversions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Union Types Converted
                                    </h4>
                                    {report.unionConversions.map((union, i) => (
                                      <div
                                        key={i}
                                        className="border rounded p-3 text-sm space-y-2"
                                      >
                                        <div className="font-medium">
                                          {union.parentType}.{union.property}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {union.original}
                                          </code>
                                          <ArrowRight className="h-3 w-3" />
                                          <code className="bg-muted px-2 py-1 rounded text-xs">
                                            [{union.converted.join(', ')}]
                                          </code>
                                          <Badge variant="outline">
                                            {union.strategy}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                              {report.inlineEnumExtractions &&
                                report.inlineEnumExtractions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Inline Enums Extracted to Files
                                    </h4>
                                    {report.inlineEnumExtractions.map(
                                      (extraction, i) => (
                                        <div
                                          key={i}
                                          className="border rounded p-3 text-sm space-y-2"
                                        >
                                          <div className="font-medium">
                                            {extraction.parentType}.
                                            {extraction.property}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span>Created enum:</span>
                                            <code className="bg-muted px-2 py-1 rounded text-xs">
                                              {extraction.newEnumName}
                                            </code>
                                            <Badge variant="outline">
                                              {extraction.values.length} values
                                            </Badge>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Values:{' '}
                                            {extraction.values.join(', ')}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {report.namingChanges &&
                                report.namingChanges.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Naming Convention Applied
                                    </h4>
                                    <div className="space-y-1">
                                      {report.namingChanges.map((change, i) => (
                                        <div
                                          key={i}
                                          className="border rounded p-3 text-sm flex items-center gap-2"
                                        >
                                          <Badge variant="outline">
                                            {change.scope}
                                          </Badge>
                                          <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {change.original}
                                          </code>
                                          <ArrowRight className="h-3 w-3" />
                                          <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {change.converted}
                                          </code>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="formats" className="space-y-3">
                          {!report.formatInferences ||
                          report.formatInferences.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No format inferences recorded for this file
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">
                                Shows how JSON Schema formats were intelligently
                                inferred from RAML types and property names
                              </div>
                              {report.formatInferences.map((inference, i) => (
                                <div
                                  key={i}
                                  className="border rounded-lg p-4 space-y-2"
                                >
                                  <div className="flex items-center gap-2 font-medium">
                                    <Settings className="h-4 w-4" />
                                    {inference.parentType}.{inference.property}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline">
                                      {inference.originalType}
                                    </Badge>
                                    <ArrowRight className="h-3 w-3" />
                                    <Badge variant="default">
                                      format: {inference.format}
                                    </Badge>
                                    <Badge
                                      variant={
                                        inference.confidence === 'high'
                                          ? 'default'
                                          : inference.confidence === 'medium'
                                            ? 'secondary'
                                            : 'outline'
                                      }
                                    >
                                      {inference.confidence} confidence
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                                    💡 {inference.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="comparison" className="space-y-3">
                          {!report.originalRamlContent ||
                          !report.generatedSchemas ||
                          report.generatedSchemas.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              Source comparison data not available for this file
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-sm text-muted-foreground">
                                Side-by-side comparison of original RAML and
                                generated JSON Schema files
                              </div>

                              {/* RAML vs JSON Schema comparison */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
                                {/* Original RAML */}
                                <div className="border rounded-lg">
                                  <div className="flex items-center justify-between p-3 border-b bg-muted/20">
                                    <div className="flex items-center gap-2 font-medium">
                                      <FileText className="h-4 w-4" />
                                      Original RAML
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        copyToClipboard(
                                          report.originalRamlContent!,
                                        )
                                      }
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <ScrollArea className="h-[350px]">
                                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                                      {report.originalRamlContent}
                                    </pre>
                                  </ScrollArea>
                                </div>

                                {/* Generated JSON Schemas */}
                                <div className="border rounded-lg">
                                  <div className="flex items-center justify-between p-3 border-b bg-muted/20">
                                    <div className="flex items-center gap-2 font-medium">
                                      <Code className="h-4 w-4" />
                                      Generated JSON Schemas (
                                      {report.generatedSchemas.length})
                                    </div>
                                  </div>
                                  <ScrollArea className="h-[350px]">
                                    <div className="p-4 space-y-4">
                                      {report.generatedSchemas.map(
                                        (schema, i) => (
                                          <div
                                            key={i}
                                            className="border rounded-lg"
                                          >
                                            <div className="flex items-center justify-between p-3 border-b bg-muted/10">
                                              <div className="flex items-center gap-2 text-sm font-medium">
                                                <File className="h-3 w-3" />
                                                {schema.fileName}
                                                <Badge
                                                  variant={
                                                    schema.type === 'enum'
                                                      ? 'secondary'
                                                      : 'default'
                                                  }
                                                  className="text-xs"
                                                >
                                                  {schema.type}
                                                </Badge>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    schema.content,
                                                  )
                                                }
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <pre className="p-3 text-xs font-mono whitespace-pre-wrap bg-muted/5 overflow-x-auto">
                                              {schema.content}
                                            </pre>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
