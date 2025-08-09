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
  /** Optional: Detailed conversion summary for the run */
  summary?: ConversionSummary;
  /** Optional: Detailed per-file conversion reports */
  reports?: ConversionReport[];
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

/**
 * Detailed per-input-file report for a RAML → JSON Schema conversion.
 */
export interface ConversionReport {
  /** Absolute path of the input RAML file */
  inputFile: string;
  /** Enum schema names written (with relative output file paths if known) */
  enumsWritten: Array<{ name: string; file?: string }>;
  /** Business object schema names written (with relative output file paths if known) */
  businessObjectsWritten: Array<{ name: string; file?: string }>;
  /** Inferred JSON Schema formats encountered (e.g., date-time, email) */
  inferredFormats: string[];
  /** Count of union types converted */
  unionsCount: number;
  /** Inline enums that were extracted into standalone enum schemas */
  inlineEnumsExtracted: string[];
  /** Enums that were detected as duplicates and deduplicated */
  dedupedEnums: string[];
  /** Warnings encountered during conversion of this file */
  warnings: ImportWarning[];
  /** Errors encountered during conversion of this file */
  errors: ImportError[];
  /** Time spent converting this file in milliseconds */
  durationMs: number;
  /** Any discovered $id targets written into output schemas */
  $idTargets: string[];

  // Enhanced detailed transformation data
  /** File mapping from input to outputs */
  fileMapping?: FileMapping;
  /** Detailed property transformations */
  propertyTransformations?: PropertyTransformation[];
  /** Union type conversions */
  unionConversions?: UnionConversion[];
  /** Inline enum extractions */
  inlineEnumExtractions?: InlineEnumExtraction[];
  /** Naming convention changes */
  namingChanges?: NamingChange[];
  /** Format inferences */
  formatInferences?: FormatInference[];

  // Source code comparison data
  /** Original RAML file content */
  originalRamlContent?: string;
  /** Generated JSON Schema files with their content */
  generatedSchemas?: Array<{
    fileName: string;
    content: string;
    type: 'business-object' | 'enum';
  }>;
}

/**
 * Aggregated summary of a RAML → JSON Schema conversion run.
 */
export interface ConversionSummary {
  /** Total number of input files processed */
  filesProcessed: number;
  /** Total number of enum schemas created */
  enumsCreated: number;
  /** Total number of business object schemas created */
  businessObjectsCreated: number;
  /** Total unions encountered across all files */
  unionsCount: number;
  /** Total number of inline enums extracted across all files */
  inlineEnumsExtracted: number;
  /** Total number of enums deduplicated across all files */
  dedupedEnums: number;
  /** Total number of warnings */
  warningsCount: number;
  /** Total number of errors */
  errorsCount: number;
  /** End-to-end conversion duration in milliseconds */
  durationMs: number;
  /** Output directory used for the conversion */
  outputDirectory: string;
}

/**
 * Detailed property transformation information.
 */
export interface PropertyTransformation {
  /** Parent type name */
  parentType: string;
  /** Property name */
  propertyName: string;
  /** Original RAML line(s) from source file */
  originalRamlLine?: string;
  /** Original RAML type */
  originalType?: string;
  /** Original RAML description */
  originalDescription?: string;
  /** Whether property was optional in RAML */
  isOptional?: boolean;
  /** Line number in RAML file */
  lineNumber?: number;
  /** Resulting JSON Schema type */
  convertedType?: string | string[];
  /** Inferred or applied format */
  format?: string;
  /** Reference to another schema */
  $ref?: string;
  /** Array items definition */
  items?: {
    type?: string;
    $ref?: string;
  };
  /** Reason why format was inferred */
  formatReason?: string;
  /** Reason for type conversion */
  typeReason?: string;
  /** Additional transformation notes */
  note?: string;
}

/**
 * File mapping from RAML input to JSON Schema outputs.
 */
export interface FileMapping {
  /** Input RAML file path */
  inputFile: string;
  /** RAML file size in bytes */
  inputSize?: number;
  /** RAML file header info */
  ramlHeader?: {
    title?: string;
    version?: string;
    description?: string;
  };
  /** Output JSON Schema files created */
  outputFiles: Array<{
    /** Output file path */
    file: string;
    /** Type of schema (business-object, enum) */
    type: 'business-object' | 'enum';
    /** Schema name */
    name: string;
    /** Output file size in bytes */
    size?: number;
    /** Schema $id if present */
    $id?: string;
  }>;
}

/**
 * Union type conversion details.
 */
export interface UnionConversion {
  /** Parent type containing the union */
  parentType: string;
  /** Property name with union type */
  property: string;
  /** Original RAML union definition */
  original: string;
  /** Line number in RAML */
  lineNumber?: number;
  /** Converted JSON Schema representation */
  converted: string[];
  /** How the union was handled */
  strategy: 'anyOf' | 'oneOf' | 'type-array' | 'enum-extraction';
}

/**
 * Inline enum extraction details.
 */
export interface InlineEnumExtraction {
  /** Parent type containing the inline enum */
  parentType: string;
  /** Property name with inline enum */
  property: string;
  /** Generated enum name */
  newEnumName: string;
  /** Output enum file */
  file: string;
  /** Enum values */
  values: string[];
  /** Line range in RAML */
  lineRange?: { start: number; end: number };
}

/**
 * Naming convention change tracking.
 */
export interface NamingChange {
  /** Original name from RAML */
  original: string;
  /** Converted name following naming convention */
  converted: string;
  /** Scope of the change */
  scope: 'type' | 'property' | 'enum' | 'file';
  /** Context for the change */
  context?: string;
}

/**
 * Format inference details.
 */
export interface FormatInference {
  /** Property that received the format */
  property: string;
  /** Parent type */
  parentType: string;
  /** Original RAML type */
  originalType: string;
  /** Inferred format */
  format: string;
  /** Reason for inference */
  reason: string;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Enhanced conversion report with detailed transformation data.
 */
export interface DetailedConversionReport {
  /** Input file mapping */
  fileMapping: FileMapping;
  /** Detailed property transformations */
  propertyTransformations: PropertyTransformation[];
  /** Union type conversions */
  unionConversions: UnionConversion[];
  /** Inline enum extractions */
  inlineEnumExtractions: InlineEnumExtraction[];
  /** Naming convention changes */
  namingChanges: NamingChange[];
  /** Format inferences */
  formatInferences: FormatInference[];
  /** Validation warnings */
  warnings: ImportWarning[];
  /** Validation errors */
  errors: ImportError[];
  /** Processing duration */
  durationMs: number;
}

/**
 * JSON export shape for download and persistence.
 */
export type ConversionReportJSON = {
  summary: ConversionSummary;
  reports: ConversionReport[];
  /** Enhanced detailed reports */
  detailedReports?: DetailedConversionReport[];
};
