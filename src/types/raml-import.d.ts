/**
 * TypeScript type definitions for RAML import functionality.
 *
 * This module defines the types for importing RAML files and converting
 * them to JSON Schema format within the Arc Elect application.
 *
 * @module raml-import
 * @author Wijnand Gritter
 * @version 1.0.0
 */

/**
 * Configuration for RAML import operation.
 */
export interface RamlImportConfig {
  /** Source directory containing RAML files */
  sourcePath: string;
  /** Destination directory for converted JSON schemas */
  destinationPath: string;
  /** Whether to clear destination directory before import */
  clearDestination: boolean;
  /** Whether to create backup of existing files */
  createBackup: boolean;
  /** Transformation options for the conversion process */
  transformationOptions: TransformationOptions;
}

/**
 * Options for RAML to JSON Schema transformation.
 */
export interface TransformationOptions {
  /** Whether to preserve original RAML structure */
  preserveStructure: boolean;
  /** Whether to generate examples from RAML types */
  generateExamples: boolean;
  /** Whether to include RAML annotations in output */
  includeAnnotations: boolean;
  /** Custom naming convention for output files */
  namingConvention: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';
  /** Whether to validate output schemas */
  validateOutput: boolean;
}

/**
 * Result of RAML import operation.
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** Number of files processed */
  processedFiles: number;
  /** Number of files successfully converted */
  convertedFiles: number;
  /** Number of files that failed conversion */
  failedFiles: number;
  /** List of import errors */
  errors: ImportError[];
  /** List of import warnings */
  warnings: ImportWarning[];
  /** Total duration of import operation in milliseconds */
  duration: number;
  /** Timestamp when import completed */
  timestamp: Date;
}

/**
 * Import error information.
 */
export interface ImportError {
  /** File path where error occurred */
  filePath: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'parsing' | 'conversion' | 'validation' | 'filesystem';
  /** Line number where error occurred (if applicable) */
  line?: number;
  /** Column number where error occurred (if applicable) */
  column?: number;
  /** Stack trace for debugging */
  stack?: string;
}

/**
 * Import warning information.
 */
export interface ImportWarning {
  /** File path where warning occurred */
  filePath: string;
  /** Warning message */
  message: string;
  /** Warning type */
  type:
    | 'deprecation'
    | 'compatibility'
    | 'performance'
    | 'best-practice'
    | 'validation';
  /** Suggestion for resolving the warning */
  suggestion?: string;
}

/**
 * Progress information for import operation.
 */
export interface ImportProgress {
  /** Current phase of import */
  phase: 'scanning' | 'converting' | 'validating' | 'saving' | 'complete';
  /** Current file being processed */
  currentFile: string;
  /** Number of files processed so far */
  processedCount: number;
  /** Total number of files to process */
  totalCount: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

/**
 * RAML file information.
 */
export interface RamlFileInfo {
  /** File path */
  path: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** Last modified date */
  lastModified: Date;
  /** Whether file is valid RAML */
  isValid: boolean;
  /** RAML version (0.8, 1.0) */
  version?: string;
  /** RAML title */
  title?: string;
  /** RAML description */
  description?: string;
}

/**
 * Import operation status.
 */
export type ImportStatus =
  | 'idle'
  | 'scanning'
  | 'converting'
  | 'validating'
  | 'saving'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Import operation state.
 */
export interface ImportState {
  /** Current status */
  status: ImportStatus;
  /** Configuration for current import */
  config: RamlImportConfig | null;
  /** Progress information */
  progress: ImportProgress | null;
  /** Import result (available when complete) */
  result: ImportResult | null;
  /** Current error (if any) */
  error: string | null;
  /** Whether import can be cancelled */
  canCancel: boolean;
}
