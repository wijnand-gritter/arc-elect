/**
 * TypeScript declarations for the Arc Elect JSON Schema Editor.
 *
 * This module defines all core interfaces and types for the schema editor,
 * including project management, schema handling, and validation.
 *
 * @module schema-editor
 * @author Wijnand Gritter
 * @version 1.0.0
 */

export {};

/**
 * Core project management interfaces
 */

/**
 * Represents a project containing JSON schemas.
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Absolute path to the project root directory */
  path: string;
  /** File pattern for schema discovery (e.g., "*.json") */
  schemaPattern: string;
  /** When the project was created */
  createdAt: Date;
  /** When the project was last modified */
  lastModified: Date;
  /** Project-specific settings and configuration */
  settings: ProjectSettings;
  /** Array of schema IDs belonging to this project */
  schemaIds: string[];
  /** Array of schemas belonging to this project */
  schemas: Schema[];
  /** Current project status and metadata */
  status: ProjectStatus;
}

/**
 * Configuration settings for a project.
 */
export interface ProjectSettings {
  /** Whether to automatically validate schemas on load */
  autoValidate: boolean;
  /** Whether to watch for file changes */
  watchForChanges: boolean;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed file extensions for schemas */
  allowedExtensions: string[];
}

/**
 * Current status and metadata for a project.
 */
export interface ProjectStatus {
  /** Whether the project is currently loaded */
  isLoaded: boolean;
  /** Whether the project is currently loading */
  isLoading: boolean;
  /** Error message if project loading failed */
  error?: string;
  /** When the project was last scanned for schemas */
  lastScanTime?: Date;
  /** Total number of schema files found */
  totalSchemas: number;
  /** Number of valid schemas */
  validSchemas: number;
  /** Number of invalid schemas */
  invalidSchemas: number;
}

/**
 * Configuration for creating a new project.
 */
export interface ProjectConfig {
  /** Project name */
  name: string;
  /** Path to the project directory */
  path: string;
  /** File pattern for schema discovery */
  schemaPattern?: string;
  /** Initial project settings */
  settings?: Partial<ProjectSettings>;
}

/**
 * Schema management interfaces
 */

/**
 * Represents a JSON schema file.
 */
export interface Schema {
  /** Unique identifier for the schema */
  id: string;
  /** ID of the project this schema belongs to */
  projectId: string;
  /** Human-readable schema name (derived from filename) */
  name: string;
  /** Absolute path to the schema file */
  path: string;
  /** Parsed JSON content of the schema */
  content: Record<string, unknown>;
  /** Schema metadata and file information */
  metadata: SchemaMetadata;
  /** Current validation status */
  validationStatus: ValidationStatus;
  /** Path relative to project root */
  relativePath: string;
  /** How the schema was imported */
  importSource?: 'json' | 'raml';
  /** When the schema was imported */
  importDate?: Date;
  /** Validation errors found during validation */
  validationErrors?: ValidationError[];
  references: SchemaReference[]; // What this schema references
  referencedBy: string[]; // What references this schema
}

export interface SchemaReference {
  $ref: string;
  schemaName: string;
}

/**
 * Metadata for a schema file.
 */
export interface SchemaMetadata {
  /** Schema title from $schema property */
  title?: string;
  /** Schema description from $schema property */
  description?: string;
  /** Schema version from $schema property */
  version?: string;
  /** JSON Schema specification version */
  $schema?: string;
  /** When the file was last modified */
  lastModified: Date;
  /** File size in bytes */
  fileSize: number;
}

/**
 * Validation status for a schema.
 */
export type ValidationStatus = 'valid' | 'invalid' | 'pending' | 'error';

/**
 * Validation result for a schema.
 */
export interface ValidationResult {
  /** Whether the schema is valid */
  isValid: boolean;
  /** Validation errors found */
  errors: ValidationError[];
  /** Validation warnings found */
  warnings: ValidationWarning[];
  /** How long validation took in milliseconds */
  duration: number;
  /** When validation was performed */
  timestamp: Date;
}

/**
 * A validation error.
 */
export interface ValidationError {
  /** JSON path to the error location */
  path: string;
  /** Instance path to the error location (Ajv format) */
  instancePath?: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity: 'error' | 'warning';
  /** Validation keyword that caused the error */
  keyword?: string;
  /** Suggested fix for the error */
  suggestion?: string;
}

/**
 * A validation warning.
 */
export interface ValidationWarning {
  /** JSON path to the warning location */
  path: string;
  /** Warning message */
  message: string;
  /** Suggested fix for the warning */
  suggestion?: string;
}

/**
 * File system operation interfaces
 */

/**
 * Result of a file system operation.
 */
export interface FileOperationResult<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;
  /** Operation result data */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** How long the operation took in milliseconds */
  duration: number;
}

/**
 * Configuration for file system operations.
 */
export interface FileOperationOptions {
  /** Whether to create backup before operation */
  createBackup?: boolean;
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  /** Maximum file size limit */
  maxSize?: number;
  /** Allowed file extensions */
  allowedExtensions?: string[];
}

/**
 * Import operation interfaces
 */

/**
 * Configuration for RAML import operations.
 */
export interface RamlImportConfig {
  /** Path to RAML source folder */
  sourcePath: string;
  /** Path to destination folder */
  destinationPath: string;
  /** Whether to clear destination before import */
  clearDestination: boolean;
  /** Whether to create backup before import */
  createBackup: boolean;
  /** Transformation options */
  transformationOptions: TransformationOptions;
}

/**
 * Options for schema transformation.
 */
export interface TransformationOptions {
  /** Whether to preserve original structure */
  preserveStructure?: boolean;
  /** Whether to validate transformed schemas */
  validateOutput?: boolean;
  /** Custom transformation rules */
  customRules?: Record<string, unknown>;
}

/**
 * Result of an import operation.
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** Number of files processed */
  processedFiles: number;
  /** Import errors encountered */
  errors: ImportError[];
  /** Import warnings encountered */
  warnings: ImportWarning[];
  /** How long the import took in milliseconds */
  duration: number;
}

/**
 * An import error.
 */
export interface ImportError {
  /** File path where error occurred */
  filePath: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'file' | 'validation' | 'transformation' | 'system';
}

/**
 * An import warning.
 */
export interface ImportWarning {
  /** File path where warning occurred */
  filePath: string;
  /** Warning message */
  message: string;
  /** Warning type */
  type: 'file' | 'validation' | 'transformation';
}

/**
 * UI state interfaces
 */

/**
 * Configuration for schema view display.
 */
export interface SchemaViewConfig {
  /** View mode for schema display */
  viewMode: 'grid' | 'list' | 'compact';
  /** Field to sort by */
  sortBy: SortField;
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
  /** Active filters */
  filters: SchemaFilters;
  /** Number of items per page */
  pageSize: number;
}

/**
 * Available sort fields for schemas.
 */
export type SortField =
  | 'name'
  | 'title'
  | 'lastModified'
  | 'fileSize'
  | 'validationStatus';

/**
 * Filters for schema display.
 */
export interface SchemaFilters {
  /** Search term */
  search: string;
  /** Validation status filter */
  validationStatus: ValidationStatus | 'all';
  /** Sort field */
  sortBy: SortField;
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
}

/**
 * Analytics interfaces
 */

/**
 * Validation statistics.
 */
export interface ValidationStatistics {
  /** Total number of schemas */
  total: number;
  /** Number of valid schemas */
  valid: number;
  /** Number of invalid schemas */
  invalid: number;
  /** Number of schemas with errors */
  error: number;
  /** Number of schemas pending validation */
  pending: number;
}
