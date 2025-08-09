import React, { useState, useMemo, useCallback } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
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

import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Download,
  FileJson,
  FileText,
  Copy,
  BarChart3,
  GitCompare,
  Settings,
  ChevronRight,
  File,
  FolderOpen,
  Hash,
  Box,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
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

interface FileItem {
  id: string;
  name: string;
  type: 'raml' | 'enum' | 'business-object';
  content: string;
  path?: string;
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
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [comparisonFile, setComparisonFile] = useState<FileItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [filterType, setFilterType] = useState<'all' | 'enums' | 'business-objects' | 'transformations'>('all');

  // Process reports into file items
  const fileItems = useMemo((): FileItem[] => {
    const items: FileItem[] = [];

    reports.forEach((report, reportIndex) => {
      // Add original RAML file
      if (report.originalRamlContent) {
        items.push({
          id: `raml-${reportIndex}`,
          name: report.inputFile?.split('/').pop() || `input-${reportIndex}.raml`,
          type: 'raml',
          content: report.originalRamlContent,
          path: report.inputFile,
        });
      }

      // Add generated schemas
      report.generatedSchemas?.forEach((schema, schemaIndex) => {
        items.push({
          id: `schema-${reportIndex}-${schemaIndex}`,
          name: schema.fileName,
          type: schema.type,
          content: schema.content,
        });
      });
    });

    return items;
  }, [reports]);

  // Filter files based on search and type
  const filteredFiles = useMemo(() => {
    return fileItems.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterType === 'all' ||
        (filterType === 'enums' && file.type === 'enum') ||
        (filterType === 'business-objects' && file.type === 'business-object') ||
        (filterType === 'transformations' && file.type === 'raml');

      return matchesSearch && matchesFilter;
    });
  }, [fileItems, searchTerm, filterType]);

  // Calculate transformation statistics
  const transformationStats = useMemo((): TransformationStats => {
    let totalProperties = 0;
    let formatsAdded = 0;
    let typesChanged = 0;
    let unionsConverted = 0;
    let enumsExtracted = 0;
    let namingChanges = 0;

    reports.forEach(report => {
      totalProperties += report.propertyTransformations?.length || 0;
      formatsAdded += report.formatInferences?.length || 0;
      typesChanged += report.propertyTransformations?.filter(p => p.originalType !== p.convertedType).length || 0;
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

  const handleFileSelect = useCallback((file: FileItem) => {
    setSelectedFile(file);
    if (!comparisonFile && file.type !== 'raml') {
      // Auto-select RAML file for comparison
      const ramlFile = fileItems.find(f => f.type === 'raml');
      if (ramlFile) {
        setComparisonFile(ramlFile);
      }
    }
  }, [fileItems, comparisonFile]);

  const handleComparisonSelect = useCallback((file: FileItem) => {
    setComparisonFile(file);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'raml': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'enum': return <Hash className="h-4 w-4 text-green-500" />;
      case 'business-object': return <Box className="h-4 w-4 text-purple-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getTransformationColor = (type: string) => {
    switch (type) {
      case 'format-added': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'type-changed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'property-renamed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'union-converted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'enum-extracted': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  const exportAsJSON = useCallback(() => {
    const exportData = {
      summary,
      reports,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversion-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [summary, reports]);

  const exportAsPDF = useCallback(() => {
    // For now, create a detailed text report
    const textReport = `RAML to JSON Schema Conversion Report
Generated: ${new Date().toLocaleString()}

SUMMARY
=======
Files Processed: ${summary.filesProcessed}
Enums Generated: ${summary.enumsCreated}
Business Objects: ${summary.businessObjectsCreated}
Total Warnings: ${summary.warningsCount}
Total Errors: ${summary.errorsCount}
Duration: ${summary.durationMs}ms

TRANSFORMATION STATISTICS
========================
Total Properties Transformed: ${transformationStats.totalProperties}
Formats Added: ${transformationStats.formatsAdded}
Types Changed: ${transformationStats.typesChanged}
Unions Converted: ${transformationStats.unionsConverted}
Inline Enums Extracted: ${transformationStats.enumsExtracted}
Naming Changes: ${transformationStats.namingChanges}

DETAILED REPORTS
===============
${reports.map((report, i) => `
Report ${i + 1}: ${report.inputFile}
${'-'.repeat(50)}
Generated Schemas: ${report.generatedSchemas?.length || 0}
Property Transformations: ${report.propertyTransformations?.length || 0}
Format Inferences: ${report.formatInferences?.length || 0}
Union Conversions: ${report.unionConversions?.length || 0}
`).join('\n')}`;

    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversion-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [summary, reports, transformationStats]);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <TabsList className="grid w-auto grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <GitCompare className="h-4 w-4 mr-2" />
              Source Comparison
            </TabsTrigger>
            <TabsTrigger value="transformations">
              <Zap className="h-4 w-4 mr-2" />
              Transformations
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={exportAsJSON} size="sm" variant="outline">
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as JSON</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={exportAsPDF} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Report
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export text report</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <TabsContent value="overview" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Statistics Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{summary.filesProcessed}</div>
                        <p className="text-xs text-muted-foreground">Files Processed</p>
                      </div>
                      <File className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{summary.enumsCreated}</div>
                        <p className="text-xs text-muted-foreground">Enums Generated</p>
                      </div>
                      <Hash className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{summary.businessObjectsCreated}</div>
                        <p className="text-xs text-muted-foreground">Business Objects</p>
                      </div>
                      <Box className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{transformationStats.totalProperties}</div>
                        <p className="text-xs text-muted-foreground">Properties Transformed</p>
                      </div>
                      <Zap className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transformation Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Transformation Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Formats Added</span>
                      <span>{transformationStats.formatsAdded}/{transformationStats.totalProperties}</span>
                    </div>
                    <Progress
                      value={(transformationStats.formatsAdded / Math.max(transformationStats.totalProperties, 1)) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Types Changed</span>
                      <span>{transformationStats.typesChanged}/{transformationStats.totalProperties}</span>
                    </div>
                    <Progress
                      value={(transformationStats.typesChanged / Math.max(transformationStats.totalProperties, 1)) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Unions Converted</span>
                      <span>{transformationStats.unionsConverted}</span>
                    </div>
                    <Progress
                      value={transformationStats.unionsConverted > 0 ? 100 : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Issues Summary */}
              {(summary.warningsCount > 0 || summary.errorsCount > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Issues Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{summary.warningsCount}</strong> warnings found
                        </AlertDescription>
                      </Alert>

                      {summary.errorsCount > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{summary.errorsCount}</strong> errors found
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Per-File Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Per-File Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reports.map((report, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{report.inputFile?.split('/').pop()}</h4>
                          <Badge variant="outline">
                            {report.generatedSchemas?.length || 0} schemas
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>Enums: {report.generatedSchemas?.filter(s => s.type === 'enum').length || 0}</div>
                          <div>BOs: {report.generatedSchemas?.filter(s => s.type === 'business-object').length || 0}</div>
                          <div>Properties: {report.propertyTransformations?.length || 0}</div>
                          <div>Formats: {report.formatInferences?.length || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="comparison" className="flex-1 p-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="h-full flex flex-col border-r">
                <div className="p-4 border-b space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={filterType === 'all' ? 'default' : 'outline'}
                      onClick={() => setFilterType('all')}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={filterType === 'enums' ? 'default' : 'outline'}
                      onClick={() => setFilterType('enums')}
                    >
                      Enums
                    </Button>
                    <Button
                      size="sm"
                      variant={filterType === 'business-objects' ? 'default' : 'outline'}
                      onClick={() => setFilterType('business-objects')}
                    >
                      BOs
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">FILES</h3>
                    {filteredFiles.map((file) => (
                      <Button
                        key={file.id}
                        variant={selectedFile?.id === file.id ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full justify-start h-auto p-2"
                        onClick={() => handleFileSelect(file)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.type)}
                          <span className="truncate text-xs">{file.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>

                {selectedFile && (
                  <div className="p-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Compare With:</h4>
                    <div className="space-y-1">
                      {fileItems
                        .filter(f => f.id !== selectedFile.id)
                        .slice(0, 5)
                        .map((file) => (
                          <Button
                            key={file.id}
                            variant={comparisonFile?.id === file.id ? 'default' : 'ghost'}
                            size="sm"
                            className="w-full justify-start h-auto p-2"
                            onClick={() => handleComparisonSelect(file)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(file.type)}
                              <span className="truncate text-xs">{file.name}</span>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={75}>
              <div className="h-full flex flex-col">
                {selectedFile && comparisonFile ? (
                  <>
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getFileIcon(comparisonFile.type)}
                          <span className="font-medium">{comparisonFile.name}</span>
                        </div>
                        <span className="text-muted-foreground">vs</span>
                        <div className="flex items-center gap-2">
                          {getFileIcon(selectedFile.type)}
                          <span className="font-medium">{selectedFile.name}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(comparisonFile.content)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Original
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedFile.content)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Generated
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <DiffEditor
                        height="100%"
                        language={comparisonFile.type === 'raml' ? 'yaml' : 'json'}
                        original={comparisonFile.content}
                        modified={selectedFile.content}
                        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
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
                  </>
                ) : selectedFile ? (
                  <>
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(selectedFile.type)}
                        <span className="font-medium">{selectedFile.name}</span>
                        <Badge variant="outline">{selectedFile.type}</Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(selectedFile.content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Content
                      </Button>
                    </div>

                    <ScrollArea className="flex-1">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                        {selectedFile.content}
                      </pre>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                      <h3 className="font-semibold">Select a file to view</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a file from the sidebar to see its content or compare with another file
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="transformations" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {reports.map((report, reportIndex) => (
                <Card key={reportIndex}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {report.inputFile?.split('/').pop() || `Report ${reportIndex + 1}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Property Transformations */}
                    {report.propertyTransformations && report.propertyTransformations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Property Transformations ({report.propertyTransformations.length})
                        </h4>
                        <Accordion type="multiple" className="w-full">
                          {report.propertyTransformations.map((transform, i) => (
                            <AccordionItem key={i} value={`transform-${reportIndex}-${i}`}>
                              <AccordionTrigger className="text-left">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge variant="outline" className="shrink-0">
                                    {transform.propertyName}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground truncate">
                                    {transform.originalType} → {transform.convertedType}
                                  </span>
                                  {transform.format && (
                                    <Badge className={getTransformationColor('format-added')}>
                                      {transform.format}
                                    </Badge>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                  <div>
                                    <strong>Original:</strong> {transform.originalType}
                                  </div>
                                  <div>
                                    <strong>Converted:</strong> {transform.convertedType}
                                  </div>
                                  <div>
                                    <strong>Line:</strong> {transform.lineNumber}
                                  </div>
                                  <div>
                                    <strong>Format:</strong> {transform.format || 'N/A'}
                                  </div>
                                  {transform.formatReason && (
                                    <div className="md:col-span-2">
                                      <strong>Format Reason:</strong> {transform.formatReason}
                                    </div>
                                  )}
                                  {transform.typeReason && (
                                    <div className="md:col-span-2">
                                      <strong>Type Reason:</strong> {transform.typeReason}
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}

                    {/* Union Conversions */}
                    {report.unionConversions && report.unionConversions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <GitCompare className="h-4 w-4" />
                          Union Conversions ({report.unionConversions.length})
                        </h4>
                        <div className="space-y-2">
                          {report.unionConversions.map((union, i) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getTransformationColor('union-converted')}>
                                  Union
                                </Badge>
                                <span className="text-sm">Line {union.lineNumber}</span>
                              </div>
                              <div className="text-sm">
                                <strong>Original:</strong> {union.original}
                              </div>
                              <div className="text-sm">
                                <strong>Strategy:</strong> {union.strategy}
                              </div>
                              <div className="text-sm">
                                <strong>Types:</strong> {union.converted.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Enum Extractions */}
                    {report.inlineEnumExtractions && report.inlineEnumExtractions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Inline Enum Extractions ({report.inlineEnumExtractions.length})
                        </h4>
                        <div className="space-y-2">
                          {report.inlineEnumExtractions.map((extraction, i) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getTransformationColor('enum-extracted')}>
                                  {extraction.newEnumName}
                                </Badge>
                                <span className="text-sm">Lines {extraction.lineRange?.start}-{extraction.lineRange?.end}</span>
                              </div>
                              <div className="text-sm">
                                <strong>Values:</strong> {extraction.values.join(', ')}
                              </div>
                              <div className="text-sm">
                                <strong>File:</strong> {extraction.file}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Format Inferences */}
                    {report.formatInferences && report.formatInferences.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Format Inferences ({report.formatInferences.length})
                        </h4>
                        <div className="space-y-2">
                          {report.formatInferences.map((inference, i) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{inference.property}</Badge>
                                <Badge className={getTransformationColor('format-added')}>
                                  {inference.format}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {inference.confidence}% confidence
                                </span>
                              </div>
                              <div className="text-sm">
                                <strong>Original Type:</strong> {inference.originalType}
                              </div>
                              <div className="text-sm">
                                <strong>Reason:</strong> {inference.reason}
                              </div>
                              <div className="text-sm">
                                <strong>Parent:</strong> {inference.parentType}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Naming Changes */}
                    {report.namingChanges && report.namingChanges.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Naming Changes ({report.namingChanges.length})
                        </h4>
                        <div className="space-y-2">
                          {report.namingChanges.map((change, i) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getTransformationColor('property-renamed')}>
                                  {change.scope}
                                </Badge>
                              </div>
                              <div className="text-sm">
                                <strong>Original:</strong> {change.original}
                              </div>
                              <div className="text-sm">
                                <strong>New:</strong> {change.converted}
                              </div>
                              <div className="text-sm">
                                <strong>Context:</strong> {change.context || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Conversion Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Conversion Pipeline */}
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold">RAML Input</div>
                          <div className="text-sm text-muted-foreground">Parse source files</div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold">Transform</div>
                          <div className="text-sm text-muted-foreground">Apply conversions</div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold">JSON Schema Output</div>
                          <div className="text-sm text-muted-foreground">Generate final schemas</div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{summary.durationMs}ms</div>
                            <p className="text-xs text-muted-foreground">Total Duration</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round(summary.durationMs / summary.filesProcessed)}ms
                            </div>
                            <p className="text-xs text-muted-foreground">Avg per File</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {Math.round((summary.enumsCreated + summary.businessObjectsCreated) / (summary.durationMs / 1000))}
                            </div>
                            <p className="text-xs text-muted-foreground">Schemas/sec</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Step-by-step breakdown */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Processing Steps</h4>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium">File Discovery</div>
                            <div className="text-sm text-muted-foreground">
                              Found {summary.filesProcessed} RAML files to process
                            </div>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>

                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium">RAML Parsing</div>
                            <div className="text-sm text-muted-foreground">
                              Parsed {transformationStats.totalProperties} properties
                            </div>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>

                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium">Type Transformations</div>
                            <div className="text-sm text-muted-foreground">
                              Transformed {transformationStats.typesChanged} property types
                            </div>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>

                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium">Format Inference</div>
                            <div className="text-sm text-muted-foreground">
                              Added {transformationStats.formatsAdded} format constraints
                            </div>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>

                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <div className="font-medium">Schema Generation</div>
                            <div className="text-sm text-muted-foreground">
                              Generated {summary.enumsCreated + summary.businessObjectsCreated} JSON Schema files
                            </div>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>

                        {(summary.warningsCount > 0 || summary.errorsCount > 0) && (
                          <div className="flex items-center gap-3 p-3 border rounded-lg border-yellow-200">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            <div className="flex-1">
                              <div className="font-medium">Issue Resolution</div>
                              <div className="text-sm text-muted-foreground">
                                {summary.warningsCount} warnings, {summary.errorsCount} errors
                              </div>
                            </div>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              Needs Attention
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversionReport;
export { ConversionReport };