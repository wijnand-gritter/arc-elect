/**
 * RAML Import Service
 *
 * Handles the conversion of RAML files to JSON Schema format.
 * Provides progress tracking, error handling, and validation.
 *
 * @module raml-import-service
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import type {
  RamlImportConfig,
  ImportResult,
  ImportProgress,
  ImportError,
  ImportWarning,
  RamlFileInfo,
  ImportStatus,
} from '../../types/raml-import';
import logger from '../lib/renderer-logger';
import { toast } from 'sonner';

/**
 * Service class for handling RAML import operations.
 */
export class RamlImportService {
  private currentImport: {
    config: RamlImportConfig;
    startTime: number;
    processedFiles: number;
    totalFiles: number;
    errors: ImportError[];
    warnings: ImportWarning[];
    cancelled: boolean;
  } | null = null;

  /**
   * Scan directory for RAML files.
   */
  async scanRamlFiles(directoryPath: string): Promise<RamlFileInfo[]> {
    try {
      logger.info('Scanning RAML files', { directoryPath });

      const result = await window.api.scanRamlFiles(directoryPath);

      if (!result.success) {
        throw new Error(result.error || 'Failed to scan RAML files');
      }

      logger.info('RAML files scanned successfully', {
        count: result.data.length,
        directoryPath,
      });

      return result.data;
    } catch (error) {
      logger.error('Failed to scan RAML files', { directoryPath, error });
      throw error;
    }
  }

  /**
   * Validate RAML import configuration.
   */
  validateConfig(config: RamlImportConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.sourcePath) {
      errors.push('Source path is required');
    }

    if (!config.destinationPath) {
      errors.push('Destination path is required');
    }

    if (config.sourcePath === config.destinationPath) {
      errors.push('Source and destination paths cannot be the same');
    }

    if (!config.transformationOptions) {
      errors.push('Transformation options are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Start RAML import operation.
   */
  async startImport(
    config: RamlImportConfig,
    onProgress?: (progress: ImportProgress) => void,
    onStatusChange?: (status: ImportStatus) => void,
  ): Promise<ImportResult> {
    try {
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(
          `Invalid configuration: ${validation.errors.join(', ')}`,
        );
      }

      // Initialize import state
      this.currentImport = {
        config,
        startTime: Date.now(),
        processedFiles: 0,
        totalFiles: 0,
        errors: [],
        warnings: [],
        cancelled: false,
      };

      logger.info('Starting RAML import', { config });
      onStatusChange?.('scanning');

      // Phase 1: Scan RAML files
      const ramlFiles = await this.scanRamlFiles(config.sourcePath);
      this.currentImport.totalFiles = ramlFiles.length;

      if (ramlFiles.length === 0) {
        throw new Error('No RAML files found in source directory');
      }

      onProgress?.({
        phase: 'scanning',
        currentFile: '',
        processedCount: 0,
        totalCount: ramlFiles.length,
        percentage: 0,
      });

      // Phase 2: Clear destination if requested
      if (config.clearDestination) {
        onStatusChange?.('converting');
        await this.clearDestination(config.destinationPath);
      }

      // Phase 3: Convert RAML files
      onStatusChange?.('converting');
      const conversionResult = await this.convertRamlFilesBatch(
        ramlFiles,
        config,
        onProgress,
      );

      // Phase 4: Validate output schemas
      if (config.transformationOptions.validateOutput) {
        onStatusChange?.('validating');
        await this.validateOutputSchemas(config.destinationPath, onProgress);
      }

      // Complete import
      onStatusChange?.('complete');
      const duration = Date.now() - this.currentImport.startTime;

      const result: ImportResult = {
        success:
          !this.currentImport.cancelled &&
          this.currentImport.errors.length === 0,
        processedFiles: this.currentImport.processedFiles,
        convertedFiles: conversionResult.convertedCount,
        failedFiles: this.currentImport.errors.length,
        errors: this.currentImport.errors,
        warnings: this.currentImport.warnings,
        duration,
        timestamp: new Date(),
      };

      logger.info('RAML import completed', { result });

      // Show completion notification
      if (result.success) {
        toast.success('RAML import completed successfully', {
          description: `Converted ${result.convertedFiles} files in ${Math.round(duration / 1000)}s`,
        });
      } else {
        toast.error('RAML import completed with errors', {
          description: `${result.failedFiles} files failed to convert`,
        });
      }

      this.currentImport = null;
      return result;
    } catch (error) {
      logger.error('RAML import failed', { error, config });

      const duration = this.currentImport
        ? Date.now() - this.currentImport.startTime
        : 0;
      const result: ImportResult = {
        success: false,
        processedFiles: this.currentImport?.processedFiles || 0,
        convertedFiles: 0,
        failedFiles: this.currentImport?.totalFiles || 0,
        errors: [
          {
            filePath: '',
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'conversion',
          },
        ],
        warnings: this.currentImport?.warnings || [],
        duration,
        timestamp: new Date(),
      };

      onStatusChange?.('error');
      this.currentImport = null;

      toast.error('RAML import failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });

      return result;
    }
  }

  /**
   * Cancel current import operation.
   */
  async cancelImport(): Promise<void> {
    if (!this.currentImport) {
      return;
    }

    logger.info('Cancelling RAML import');
    this.currentImport.cancelled = true;

    // Cancel the conversion process via IPC
    try {
      await window.api.cancelRamlImport();
    } catch (error) {
      logger.warn('Failed to cancel RAML import via IPC', { error });
    }

    toast.info('RAML import cancelled');
  }

  /**
   * Clear destination directory.
   */
  private async clearDestination(destinationPath: string): Promise<void> {
    try {
      logger.info('Clearing destination directory', { destinationPath });

      const result = await window.api.clearDirectory(destinationPath);

      if (!result.success) {
        throw new Error(
          result.error || 'Failed to clear destination directory',
        );
      }

      logger.info('Destination directory cleared successfully');
    } catch (error) {
      logger.error('Failed to clear destination directory', {
        destinationPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Convert RAML files to JSON Schema.
   * This method uses a placeholder for the actual conversion script.
   */
  private async convertRamlFiles(
    ramlFiles: RamlFileInfo[],
    config: RamlImportConfig,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<{ convertedCount: number }> {
    if (!this.currentImport) {
      throw new Error('No active import operation');
    }

    let convertedCount = 0;

    for (let i = 0; i < ramlFiles.length; i++) {
      if (this.currentImport.cancelled) {
        break;
      }

      const file = ramlFiles[i];

      try {
        // Update progress
        onProgress?.({
          phase: 'converting',
          currentFile: file.name,
          processedCount: i,
          totalCount: ramlFiles.length,
          percentage: Math.round((i / ramlFiles.length) * 100),
          estimatedTimeRemaining: this.calculateEstimatedTime(
            i,
            ramlFiles.length,
          ),
        });

        // PLACEHOLDER: Call the actual RAML conversion script
        // This will be replaced with the user's conversion script
        const conversionResult = await this.convertSingleRamlFile(file, config);

        if (conversionResult.success) {
          convertedCount++;
        } else {
          this.currentImport.errors.push({
            filePath: file.path,
            message: conversionResult.error || 'Conversion failed',
            type: 'conversion',
          });
        }

        this.currentImport.processedFiles++;
      } catch (error) {
        logger.error('Failed to convert RAML file', { file: file.path, error });

        this.currentImport.errors.push({
          filePath: file.path,
          message:
            error instanceof Error ? error.message : 'Unknown conversion error',
          type: 'conversion',
        });
      }
    }

    return { convertedCount };
  }

  /**
   * PLACEHOLDER: Convert single RAML file to JSON Schema.
   * This method will be replaced with the user's actual conversion script.
   */
  private async convertSingleRamlFile(
    file: RamlFileInfo,
    config: RamlImportConfig,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('Converting RAML file (placeholder)', { file: file.path });

      // PLACEHOLDER: This is where the actual conversion script will be called
      // The user will provide their own conversion logic here
      const result = await window.api.convertRamlFile({
        sourcePath: file.path,
        destinationPath: config.destinationPath,
        options: config.transformationOptions,
      });

      return result;
    } catch (error) {
      logger.error('RAML conversion failed', { file: file.path, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert RAML files using batch processing for better performance.
   */
  private async convertRamlFilesBatch(
    ramlFiles: RamlFileInfo[],
    config: RamlImportConfig,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<{ convertedCount: number }> {
    if (!this.currentImport) {
      throw new Error('No active import operation');
    }

    try {
      logger.info('Starting batch RAML conversion', {
        fileCount: ramlFiles.length,
        sourceDirectory: config.sourcePath,
        destinationDirectory: config.destinationPath,
      });

      // Use the batch conversion API for better performance
      const result = await window.api.convertRamlBatch({
        sourceDirectory: config.sourcePath,
        destinationDirectory: config.destinationPath,
        options: config.transformationOptions,
      });

      if (result.success) {
        // Update progress to completion
        onProgress?.({
          phase: 'converting',
          currentFile: '',
          processedCount: result.summary.total,
          totalCount: result.summary.total,
          percentage: 100,
        });

        // Process any errors from the batch operation
        for (const conversionResult of result.results) {
          if (!conversionResult.success) {
            this.currentImport.errors.push({
              filePath: conversionResult.inputFile,
              message: conversionResult.error || 'Conversion failed',
              type: 'conversion',
            });
          }
        }

        this.currentImport.processedFiles = result.summary.total;

        logger.info('Batch RAML conversion completed', {
          summary: result.summary,
        });

        return { convertedCount: result.summary.successful };
      } else {
        throw new Error(result.error || 'Batch conversion failed');
      }
    } catch (error) {
      logger.error('Batch RAML conversion failed', { error });

      // Fall back to individual file conversion
      logger.info('Falling back to individual file conversion');
      return this.convertRamlFiles(ramlFiles, config, onProgress);
    }
  }

  /**
   * Validate output JSON schemas.
   */
  private async validateOutputSchemas(
    destinationPath: string,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<void> {
    try {
      logger.info('Validating output schemas', { destinationPath });

      onProgress?.({
        phase: 'validating',
        currentFile: '',
        processedCount: 0,
        totalCount: 1,
        percentage: 50,
      });

      const result = await window.api.validateSchemas(destinationPath);

      if (!result.success) {
        this.currentImport?.warnings.push({
          filePath: destinationPath,
          message: 'Some output schemas failed validation',
          type: 'compatibility',
          suggestion: 'Review conversion settings and source RAML files',
        });
      }

      onProgress?.({
        phase: 'validating',
        currentFile: '',
        processedCount: 1,
        totalCount: 1,
        percentage: 100,
      });
    } catch (error) {
      logger.warn('Schema validation failed', { destinationPath, error });

      this.currentImport?.warnings.push({
        filePath: destinationPath,
        message: 'Failed to validate output schemas',
        type: 'validation',
        suggestion: 'Manually verify converted schemas',
      });
    }
  }

  /**
   * Calculate estimated time remaining for import operation.
   */
  private calculateEstimatedTime(
    processed: number,
    total: number,
  ): number | undefined {
    if (!this.currentImport || processed === 0) {
      return undefined;
    }

    const elapsed = Date.now() - this.currentImport.startTime;
    const avgTimePerFile = elapsed / processed;
    const remaining = total - processed;

    return Math.round(avgTimePerFile * remaining);
  }

  /**
   * Get current import status.
   */
  getCurrentImport() {
    return this.currentImport;
  }

  /**
   * Check if import is currently running.
   */
  isImporting(): boolean {
    return this.currentImport !== null && !this.currentImport.cancelled;
  }
}

// Export singleton instance
export const ramlImportService = new RamlImportService();
