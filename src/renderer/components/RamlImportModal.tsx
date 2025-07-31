/**
 * RAML Import Modal Component
 *
 * Provides a comprehensive interface for importing RAML files and converting
 * them to JSON Schema format. Includes configuration options, progress tracking,
 * and error handling.
 *
 * @module RamlImportModal
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  FolderOpen,
  Upload,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../stores/useAppStore';
import { ramlImportService } from '../services/raml-import';
import type {
  RamlImportConfig,
  ImportResult,
  ImportProgress,
  ImportStatus,
  RamlFileInfo,
  TransformationOptions,
} from '../../types/raml-import';
import { safeHandler } from '../lib/error-handling';
import logger from '../lib/renderer-logger';

interface RamlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}

export const RamlImportModal: React.FC<RamlImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  // State management
  const { currentProject, loadProject } = useAppStore();
  const [activeTab, setActiveTab] = useState<'config' | 'progress' | 'results'>('config');
  const [config, setConfig] = useState<RamlImportConfig>({
    sourcePath: '',
    destinationPath: currentProject?.path || '',
    clearDestination: false,
    createBackup: true,
    transformationOptions: {
      preserveStructure: true,
      generateExamples: false,
      includeAnnotations: true,
      namingConvention: 'kebab-case',
      validateOutput: true,
    },
  });

  // Import state
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [ramlFiles, setRamlFiles] = useState<RamlFileInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update destination path when project changes
  useEffect(() => {
    if (currentProject?.path && !config.destinationPath) {
      setConfig((prev) => ({
        ...prev,
        destinationPath: currentProject.path,
      }));
    }
  }, [currentProject?.path, config.destinationPath]);

  // Validate configuration
  useEffect(() => {
    const validation = ramlImportService.validateConfig(config);
    setValidationErrors(validation.errors);
  }, [config]);

  // Handle source folder selection
  const handleSelectSourceFolder = safeHandler(async () => {
    try {
      const result = await window.api.selectFolder('Select RAML Source Folder');

      if (result.success && result.data) {
        setConfig((prev) => ({ ...prev, sourcePath: result.data }));

        // Automatically scan for RAML files
        await scanRamlFiles(result.data);
      }
    } catch (error) {
      logger.error('Failed to select source folder', { error });
      toast.error('Failed to select source folder');
    }
  });

  // Handle destination folder selection
  const handleSelectDestinationFolder = safeHandler(async () => {
    try {
      const result = await window.api.selectFolder('Select Destination Folder');

      if (result.success && result.data) {
        setConfig((prev) => ({ ...prev, destinationPath: result.data }));
      }
    } catch (error) {
      logger.error('Failed to select destination folder', { error });
      toast.error('Failed to select destination folder');
    }
  });

  // Scan RAML files in source directory
  const scanRamlFiles = safeHandler(async (sourcePath: string) => {
    setIsScanning(true);
    try {
      const files = await ramlImportService.scanRamlFiles(sourcePath);
      setRamlFiles(files);

      if (files.length === 0) {
        toast.warning('No RAML files found in selected directory');
      } else {
        toast.success(`Found ${files.length} RAML file${files.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      logger.error('Failed to scan RAML files', { error });
      toast.error('Failed to scan RAML files');
      setRamlFiles([]);
    } finally {
      setIsScanning(false);
    }
  });

  // Handle import start
  const handleStartImport = safeHandler(async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix configuration errors before starting import');
      return;
    }

    setActiveTab('progress');
    setImportResult(null);

    try {
      const result = await ramlImportService.startImport(
        config,
        (progress) => {
          setImportProgress(progress);
        },
        (status) => {
          setImportStatus(status);
          if (status === 'complete') {
            setActiveTab('results');
          }
        },
      );

      setImportResult(result);
      onImportComplete?.(result);

      // Reload project if import was successful
      if (result.success && currentProject) {
        await loadProject(currentProject.id);
      }
    } catch (error) {
      logger.error('Import failed', { error });
      setImportStatus('error');
      setActiveTab('results');
    }
  });

  // Handle import cancellation
  const handleCancelImport = safeHandler(async () => {
    await ramlImportService.cancelImport();
    setImportStatus('cancelled');
    setImportProgress(null);
  });

  // Handle modal close
  const handleClose = useCallback(() => {
    if (importStatus === 'idle' || importStatus === 'complete' || importStatus === 'error') {
      onClose();
      // Reset state
      setTimeout(() => {
        setActiveTab('config');
        setImportStatus('idle');
        setImportProgress(null);
        setImportResult(null);
      }, 300);
    } else {
      toast.warning('Cannot close modal while import is in progress');
    }
  }, [importStatus, onClose]);

  // Update transformation options
  const updateTransformationOptions = (updates: Partial<TransformationOptions>) => {
    setConfig((prev) => ({
      ...prev,
      transformationOptions: {
        ...prev.transformationOptions,
        ...updates,
      },
    }));
  };

  const canStartImport =
    validationErrors.length === 0 && ramlFiles.length > 0 && importStatus === 'idle';
  const isImporting = ['scanning', 'converting', 'validating', 'saving'].includes(importStatus);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import RAML</DialogTitle>
          <DialogDescription>
            Import RAML files and convert them to JSON Schema format. Select source and destination paths.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'config' | 'progress' | 'results')}
          className="flex-1"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" disabled={isImporting}>
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="progress" disabled={importStatus === 'idle'}>
              <Loader2 className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!importResult}>
              <FileText className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            <ScrollArea className="h-[500px] pr-4">
              {/* Source Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Source Configuration</CardTitle>
                  <CardDescription>
                    Select the folder containing RAML files to import
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourcePath">Source Folder</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sourcePath"
                        value={config.sourcePath}
                        placeholder="Select folder containing RAML files..."
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSelectSourceFolder}
                        disabled={isImporting}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Browse
                      </Button>
                    </div>
                  </div>

                  {/* RAML Files Preview */}
                  {config.sourcePath && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>RAML Files Found</Label>
                        {isScanning && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>

                      {ramlFiles.length > 0 ? (
                        <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                          {ramlFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1">{file.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={file.isValid ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {file.isValid ? 'Valid' : 'Invalid'}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : config.sourcePath && !isScanning ? (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            No RAML files found in the selected directory
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Destination Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Destination Configuration</CardTitle>
                  <CardDescription>
                    Configure where converted JSON schemas will be saved
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationPath">Destination Folder</Label>
                    <div className="flex gap-2">
                      <Input
                        id="destinationPath"
                        value={config.destinationPath}
                        placeholder="Select destination folder..."
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSelectDestinationFolder}
                        disabled={isImporting}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Browse
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="clearDestination"
                      checked={config.clearDestination}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, clearDestination: checked }))
                      }
                      disabled={isImporting}
                    />
                    <Label htmlFor="clearDestination">Clear destination folder before import</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="createBackup"
                      checked={config.createBackup}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, createBackup: checked }))
                      }
                      disabled={isImporting}
                    />
                    <Label htmlFor="createBackup">Create backup of existing files</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Transformation Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transformation Options</CardTitle>
                  <CardDescription>
                    Configure how RAML files are converted to JSON Schema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preserveStructure"
                        checked={config.transformationOptions.preserveStructure}
                        onCheckedChange={(checked) =>
                          updateTransformationOptions({ preserveStructure: checked })
                        }
                        disabled={isImporting}
                      />
                      <Label htmlFor="preserveStructure">Preserve structure</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="generateExamples"
                        checked={config.transformationOptions.generateExamples}
                        onCheckedChange={(checked) =>
                          updateTransformationOptions({ generateExamples: checked })
                        }
                        disabled={isImporting}
                      />
                      <Label htmlFor="generateExamples">Generate examples</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="includeAnnotations"
                        checked={config.transformationOptions.includeAnnotations}
                        onCheckedChange={(checked) =>
                          updateTransformationOptions({ includeAnnotations: checked })
                        }
                        disabled={isImporting}
                      />
                      <Label htmlFor="includeAnnotations">Include annotations</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="validateOutput"
                        checked={config.transformationOptions.validateOutput}
                        onCheckedChange={(checked) =>
                          updateTransformationOptions({ validateOutput: checked })
                        }
                        disabled={isImporting}
                      />
                      <Label htmlFor="validateOutput">Validate output</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namingConvention">Naming Convention</Label>
                    <Select
                      value={config.transformationOptions.namingConvention}
                      onValueChange={(value) =>
                        updateTransformationOptions({
                          namingConvention: value as TransformationOptions['namingConvention'],
                        })
                      }
                      disabled={isImporting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kebab-case">kebab-case</SelectItem>
                        <SelectItem value="camelCase">camelCase</SelectItem>
                        <SelectItem value="PascalCase">PascalCase</SelectItem>
                        <SelectItem value="snake_case">snake_case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Configuration errors:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleStartImport} disabled={!canStartImport}>
                <Upload className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Import Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {importProgress?.currentFile || 'Preparing import...'}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {importStatus.replace('-', ' ')}
                </Badge>
              </div>

              {importProgress && (
                <>
                  <Progress value={importProgress.percentage} className="w-full" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Progress:</span>{' '}
                      {importProgress.processedCount} / {importProgress.totalCount}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phase:</span>{' '}
                      <span className="capitalize">{importProgress.phase}</span>
                    </div>
                    {importProgress.estimatedTimeRemaining && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Estimated time remaining:</span>{' '}
                        {Math.round(importProgress.estimatedTimeRemaining / 1000)}s
                      </div>
                    )}
                  </div>
                </>
              )}

              {isImporting && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={handleCancelImport}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Import
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {importResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <h3 className="text-lg font-medium">
                    Import {importResult.success ? 'Completed' : 'Failed'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {importResult.convertedFiles}
                      </div>
                      <p className="text-xs text-muted-foreground">Files Converted</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {importResult.failedFiles}
                      </div>
                      <p className="text-xs text-muted-foreground">Files Failed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(importResult.duration / 1000)}s
                      </div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Errors ({importResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{error.filePath}</div>
                              <div className="text-muted-foreground">{error.message}</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {importResult.warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-yellow-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings ({importResult.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {importResult.warnings.map((warning, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{warning.filePath}</div>
                              <div className="text-muted-foreground">{warning.message}</div>
                              {warning.suggestion && (
                                <div className="text-blue-600 text-xs">{warning.suggestion}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleClose}>Close</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
