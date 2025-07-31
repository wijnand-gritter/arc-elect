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

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Upload, FolderOpen, Settings, Loader2, Folder } from 'lucide-react';
import { toast } from 'sonner';
import type {
  RamlImportConfig,
  ImportResult,
} from '../../types/raml-import';

interface RamlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (config: RamlImportConfig) => Promise<ImportResult>;
}

export function RamlImportModal({
  isOpen,
  onClose,
  onImport,
}: RamlImportModalProps): React.JSX.Element {
  const [config, setConfig] = useState<RamlImportConfig>({
    sourcePath: '',
    destinationPath: '',
    clearDestination: true,
    createBackup: false,
    transformationOptions: {
      preserveStructure: true,
      generateExamples: false,
      includeAnnotations: true,
      namingConvention: 'kebab-case',
      validateOutput: true,
    },
  });

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleSourcePathChange = (path: string) => {
    setConfig((prev) => ({
      ...prev,
      sourcePath: path,
    }));
  };

  const handleDestinationPathChange = (path: string) => {
    setConfig((prev) => ({
      ...prev,
      destinationPath: path,
    }));
  };



  const handleImport = async () => {
    if (!config.sourcePath || !config.destinationPath) {
      toast.error('Please select both source and destination paths');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus('Starting import...');

    try {
      // Simulate import progress
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onImport(config);

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportStatus('Import completed successfully!');

      setTimeout(() => {
        onClose();
        setIsImporting(false);
        setImportProgress(0);
        setImportStatus('');
      }, 1000);
    } catch (error) {
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsImporting(false);
      setImportProgress(0);
      setImportStatus('');
    }
  };

  const handleBrowseSource = async () => {
    try {
      const result = await window.api.selectFolder('Select RAML Source Directory');
      if (result.success && result.data && typeof result.data === 'string') {
        setConfig((prev) => ({
          ...prev,
          sourcePath: result.data as string,
        }));
      }
    } catch (_error) {
      toast.error('Failed to select source directory');
    }
  };

  const handleBrowseDestination = async () => {
    try {
      const result = await window.api.selectFolder('Select Destination Directory');
      if (result.success && result.data && typeof result.data === 'string') {
        // Create the directory if it doesn't exist
        const createResult = await window.api.createDirectory(result.data);
        if (createResult.success) {
          setConfig((prev) => ({
            ...prev,
            destinationPath: result.data as string,
          }));
        } else {
          toast.error('Failed to create destination directory');
        }
      }
    } catch (_error) {
      toast.error('Failed to select destination directory');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" layout="flex" className="max-h-[90vh] overflow-hidden w-[700px]">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Import RAML</DialogTitle>
          <DialogDescription>
            Import RAML files and convert them to JSON Schema format. Select source and destination
            paths.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <Card className="h-full">
              <CardContent className="p-6 space-y-6">
                {/* Source Path */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Source Directory</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Select source directory containing RAML files"
                      value={config.sourcePath}
                      onChange={(e) => handleSourcePathChange(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleBrowseSource} variant="outline">
                      Browse
                    </Button>
                  </div>
                  {config.sourcePath && (
                    <p className="text-xs text-muted-foreground">Selected: {config.sourcePath}</p>
                  )}
                </div>

                {/* Destination Path */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Destination Directory</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Select destination directory for JSON Schema files"
                      value={config.destinationPath}
                      onChange={(e) => handleDestinationPathChange(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleBrowseDestination} variant="outline">
                      Browse
                    </Button>
                  </div>
                  {config.destinationPath && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {config.destinationPath}
                    </p>
                  )}
                </div>

                {/* Import Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Import Options</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="clear-destination">Clear destination before import</Label>
                      <p className="text-xs text-muted-foreground">
                        Remove existing files in destination directory
                      </p>
                    </div>
                    <Switch
                      id="clear-destination"
                      checked={config.clearDestination}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, clearDestination: checked }))
                      }
                    />
                  </div>
                </div>



                {/* Import Progress */}
                {isImporting && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Import Progress</Label>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground">{importStatus}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollArea>
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !config.sourcePath || !config.destinationPath}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
