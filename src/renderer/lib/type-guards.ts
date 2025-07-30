/**
 * Comprehensive type guards for Arc Elect application.
 *
 * This module provides type-safe validation functions for all major
 * data structures used throughout the application.
 *
 * @module type-guards
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from './renderer-logger';

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if a value is an object (but not null).
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is null or undefined.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// ============================================================================
// Schema Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid Schema object.
 */
export function isSchema(value: unknown): value is Schema {
  if (!isObject(value)) return false;

  const schema = value as Record<string, unknown>;

  return (
    isString(schema.id) &&
    isString(schema.name) &&
    isString(schema.path) &&
    isObject(schema.content) &&
    isObject(schema.metadata) &&
    isArray(schema.referencedBy) &&
    schema.referencedBy.every(isString)
  );
}

/**
 * Type guard for checking if a value is a valid Schema array.
 */
export function isSchemaArray(value: unknown): value is Schema[] {
  return isArray(value) && value.every(isSchema);
}

/**
 * Type guard for checking if a value is a valid SchemaMetadata object.
 */
export function isSchemaMetadata(value: unknown): value is SchemaMetadata {
  if (!isObject(value)) return false;

  const metadata = value as Record<string, unknown>;

  return (
    isString(metadata.title) &&
    isString(metadata.description) &&
    isNumber(metadata.fileSize) &&
    metadata.lastModified instanceof Date &&
    isString(metadata.version)
  );
}

// ============================================================================
// Project Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid Project object.
 */
export function isProject(value: unknown): value is Project {
  if (!isObject(value)) return false;

  const project = value as Record<string, unknown>;

  return (
    isString(project.id) &&
    isString(project.name) &&
    isString(project.path) &&
    isArray(project.schemas) &&
    project.schemas.every(isSchema) &&
    project.createdAt instanceof Date &&
    project.lastModified instanceof Date
  );
}

/**
 * Type guard for checking if a value is a valid ProjectConfig object.
 */
export function isProjectConfig(value: unknown): value is ProjectConfig {
  if (!isObject(value)) return false;

  const config = value as Record<string, unknown>;

  return (
    isString(config.name) &&
    isString(config.path) &&
    (isString(config.description) || config.description === undefined)
  );
}

// ============================================================================
// Validation Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid ValidationError object.
 */
export function isValidationError(value: unknown): value is ValidationError {
  if (!isObject(value)) return false;

  const error = value as Record<string, unknown>;

  return (
    isNumber(error.line) &&
    isNumber(error.column) &&
    isString(error.message) &&
    isString(error.severity) &&
    ['error', 'warning', 'info'].includes(error.severity) &&
    isNumber(error.startLineNumber) &&
    isNumber(error.startColumn) &&
    isNumber(error.endLineNumber) &&
    isNumber(error.endColumn)
  );
}

/**
 * Type guard for checking if a value is a valid ValidationError array.
 */
export function isValidationErrorArray(value: unknown): value is ValidationError[] {
  return isArray(value) && value.every(isValidationError);
}

// ============================================================================
// Analytics Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid AnalyticsResult object.
 */
export function isAnalyticsResult(value: unknown): value is AnalyticsResult {
  if (!isObject(value)) return false;

  const result = value as Record<string, unknown>;

  return (
    isArray(result.circularReferences) &&
    result.circularReferences.every(isString) &&
    isObject(result.complexityMetrics) &&
    isObject(result.projectMetrics) &&
    isObject(result.performance) &&
    isNumber(result.performance.duration)
  );
}

/**
 * Type guard for checking if a value is a valid ComplexityMetrics object.
 */
export function isComplexityMetrics(value: unknown): value is ComplexityMetrics {
  if (!isObject(value)) return false;

  const metrics = value as Record<string, unknown>;

  return (
    isNumber(metrics.maxDepth) &&
    isNumber(metrics.maxBreadth) &&
    isNumber(metrics.totalProperties) &&
    isNumber(metrics.requiredProperties) &&
    isNumber(metrics.optionalProperties) &&
    isNumber(metrics.averageDepth) &&
    isNumber(metrics.averageBreadth)
  );
}

// ============================================================================
// IPC Response Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid IPC success response.
 */
export function isIpcSuccessResponse<T>(value: unknown): value is { success: true; data: T } {
  if (!isObject(value)) return false;

  const response = value as Record<string, unknown>;

  return response.success === true && 'data' in response;
}

/**
 * Type guard for checking if a value is a valid IPC error response.
 */
export function isIpcErrorResponse(value: unknown): value is { success: false; error: string } {
  if (!isObject(value)) return false;

  const response = value as Record<string, unknown>;

  return response.success === false && isString(response.error);
}

/**
 * Type guard for checking if a value is a valid IPC response.
 */
export function isIpcResponse<T>(value: unknown): value is IpcResponse<T> {
  return isIpcSuccessResponse<T>(value) || isIpcErrorResponse(value);
}

// ============================================================================
// Theme and UI Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid Theme.
 */
export function isTheme(value: unknown): value is Theme {
  return isString(value) && ['light', 'dark', 'system'].includes(value);
}

/**
 * Type guard for checking if a value is a valid Page.
 */
export function isPage(value: unknown): value is Page {
  return (
    isString(value) &&
    ['home', 'about', 'settings', 'project', 'explore', 'build', 'analytics'].includes(value)
  );
}

// ============================================================================
// Search and Filter Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid SchemaFilters object.
 */
export function isSchemaFilters(value: unknown): value is SchemaFilters {
  if (!isObject(value)) return false;

  const filters = value as Record<string, unknown>;

  return (
    isArray(filters.status) &&
    filters.status.every(isString) &&
    isArray(filters.type) &&
    filters.type.every(isString) &&
    isString(filters.searchQuery) &&
    isBoolean(filters.showValid) &&
    isBoolean(filters.showInvalid) &&
    isBoolean(filters.showError)
  );
}

/**
 * Type guard for checking if a value is a valid SavedSearch object.
 */
export function isSavedSearch(value: unknown): value is SavedSearch {
  if (!isObject(value)) return false;

  const search = value as Record<string, unknown>;

  return (
    isString(search.id) &&
    isString(search.name) &&
    isString(search.query) &&
    isSchemaFilters(search.filters) &&
    search.createdAt instanceof Date
  );
}

// ============================================================================
// Modal Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid SchemaDetailModal object.
 */
export function isSchemaDetailModal(value: unknown): value is SchemaDetailModal {
  if (!isObject(value)) return false;

  const modal = value as Record<string, unknown>;

  return (
    isSchema(modal.schema) &&
    isString(modal.activeTab) &&
    ['overview', 'content', 'properties', 'references', 'validation'].includes(modal.activeTab) &&
    isString(modal.id)
  );
}

// ============================================================================
// Utility Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a valid Date.
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard for checking if a value is a valid URL string.
 */
export function isUrl(value: unknown): value is string {
  if (!isString(value)) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for checking if a value is a valid file path.
 */
export function isFilePath(value: unknown): value is string {
  if (!isString(value)) return false;

  // Basic file path validation
  return value.length > 0 && !value.includes('\0');
}

/**
 * Type guard for checking if a value is a valid JSON string.
 */
export function isJsonString(value: unknown): value is string {
  if (!isString(value)) return false;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates and logs type guard failures for debugging.
 */
export function validateWithLogging<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  context: string,
): value is T {
  const isValid = typeGuard(value);

  if (!isValid) {
    logger.warn(`Type guard failed for ${context}`, {
      value: typeof value === 'object' ? JSON.stringify(value) : value,
      expectedType: typeGuard.name,
    });
  }

  return isValid;
}

/**
 * Safe type assertion with fallback.
 */
export function safeTypeAssertion<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  fallback: T,
  context: string,
): T {
  if (typeGuard(value)) {
    return value;
  }

  logger.warn(`Type assertion failed for ${context}, using fallback`, {
    value: typeof value === 'object' ? JSON.stringify(value) : value,
    expectedType: typeGuard.name,
  });

  return fallback;
}

// ============================================================================
// Type Definitions (for reference)
// ============================================================================

// These are the types that the type guards validate against
// They should match the actual types used in the application

interface Schema {
  id: string;
  name: string;
  path: string;
  content: Record<string, unknown>;
  metadata: SchemaMetadata;
  referencedBy: string[];
}

interface SchemaMetadata {
  title: string;
  description: string;
  fileSize: number;
  lastModified: Date;
  version: string;
}

interface Project {
  id: string;
  name: string;
  path: string;
  schemas: Schema[];
  createdAt: Date;
  lastModified: Date;
}

interface ProjectConfig {
  name: string;
  path: string;
  description?: string;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface AnalyticsResult {
  circularReferences: string[];
  complexityMetrics: ComplexityMetrics;
  projectMetrics: Record<string, unknown>;
  performance: { duration: number };
}

interface ComplexityMetrics {
  maxDepth: number;
  maxBreadth: number;
  totalProperties: number;
  requiredProperties: number;
  optionalProperties: number;
  averageDepth: number;
  averageBreadth: number;
}

type IpcResponse<T> = { success: true; data: T } | { success: false; error: string };

type Theme = 'light' | 'dark' | 'system';

type Page = 'home' | 'about' | 'settings' | 'project' | 'explore' | 'build' | 'analytics';

interface SchemaFilters {
  status: string[];
  type: string[];
  searchQuery: string;
  showValid: boolean;
  showInvalid: boolean;
  showError: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SchemaFilters;
  createdAt: Date;
}

interface SchemaDetailModal {
  schema: Schema;
  activeTab: 'overview' | 'content' | 'properties' | 'references' | 'validation';
  id: string;
}
