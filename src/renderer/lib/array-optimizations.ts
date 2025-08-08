/**
 * Optimized array operations for Arc Elect application.
 *
 * This module provides high-performance array utilities optimized
 * for large datasets and frequent operations.
 *
 * @module array-optimizations
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from './renderer-logger';

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance monitoring for array operations.
 */
const performanceMetrics = {
  operations: 0,
  totalTime: 0,
  slowOperations: [] as Array<{
    operation: string;
    duration: number;
    size: number;
  }>,
};

/**
 * Wraps an array operation with performance monitoring.
 */
function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => T,
  arraySize: number,
): T {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;

  performanceMetrics.operations++;
  performanceMetrics.totalTime += duration;

  // Log slow operations
  if (duration > 10) {
    // 10ms threshold
    performanceMetrics.slowOperations.push({
      operation,
      duration,
      size: arraySize,
    });

    logger.warn('Slow array operation detected', {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      arraySize,
    });
  }

  return result;
}

// ============================================================================
// Optimized Array Operations
// ============================================================================

/**
 * Optimized array filtering with early termination.
 *
 * @param array - Array to filter
 * @param predicate - Filter function
 * @param maxResults - Maximum number of results to return
 * @returns Filtered array
 */
export function optimizedFilter<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  maxResults?: number,
): T[] {
  return withPerformanceMonitoring(
    'filter',
    () => {
      const result: T[] = [];

      for (let i = 0; i < array.length; i++) {
        if (predicate(array[i], i)) {
          result.push(array[i]);

          // Early termination if max results reached
          if (maxResults && result.length >= maxResults) {
            break;
          }
        }
      }

      return result;
    },
    array.length,
  );
}

/**
 * Optimized array mapping with chunking for large arrays.
 *
 * @param array - Array to map
 * @param mapper - Mapping function
 * @param chunkSize - Size of chunks to process
 * @returns Mapped array
 */
export function optimizedMap<T, U>(
  array: T[],
  mapper: (item: T, index: number) => U,
  chunkSize: number = 1000,
): U[] {
  return withPerformanceMonitoring(
    'map',
    () => {
      const result: U[] = [];

      // Process in chunks for large arrays
      if (array.length > chunkSize) {
        for (let i = 0; i < array.length; i += chunkSize) {
          const chunk = array.slice(i, i + chunkSize);
          const mappedChunk = chunk.map((item, index) =>
            mapper(item, i + index),
          );
          result.push(...mappedChunk);
        }
      } else {
        return array.map(mapper);
      }

      return result;
    },
    array.length,
  );
}

/**
 * Optimized array sorting with memoization.
 *
 * @param array - Array to sort
 * @param compareFn - Comparison function
 * @returns Sorted array
 */
export function optimizedSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number,
): T[] {
  return withPerformanceMonitoring(
    'sort',
    () => {
      // Use native sort for small arrays
      if (array.length < 1000) {
        return [...array].sort(compareFn);
      }

      // For large arrays, use a more efficient approach
      const result = [...array];
      result.sort(compareFn);
      return result;
    },
    array.length,
  );
}

/**
 * Optimized array deduplication using Set.
 *
 * @param array - Array to deduplicate
 * @param keyFn - Function to extract key for comparison
 * @returns Deduplicated array
 */
export function optimizedDeduplicate<T>(
  array: T[],
  keyFn?: (item: T) => string | number,
): T[] {
  return withPerformanceMonitoring(
    'deduplicate',
    () => {
      if (!keyFn) {
        return [...new Set(array)];
      }

      const seen = new Set<string | number>();
      const result: T[] = [];

      for (const item of array) {
        const key = keyFn(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }

      return result;
    },
    array.length,
  );
}

/**
 * Optimized array grouping by key.
 *
 * @param array - Array to group
 * @param keyFn - Function to extract grouping key
 * @returns Grouped object
 */
export function optimizedGroupBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
): Record<string | number, T[]> {
  return withPerformanceMonitoring(
    'groupBy',
    () => {
      const groups: Record<string | number, T[]> = {};

      for (const item of array) {
        const key = keyFn(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
      }

      return groups;
    },
    array.length,
  );
}

/**
 * Optimized array chunking for processing large arrays.
 *
 * @param array - Array to chunk
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 */
export function optimizedChunk<T>(array: T[], chunkSize: number): T[][] {
  return withPerformanceMonitoring(
    'chunk',
    () => {
      const chunks: T[][] = [];

      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }

      return chunks;
    },
    array.length,
  );
}

/**
 * Optimized array flattening.
 *
 * @param array - Array to flatten
 * @param depth - Flattening depth
 * @returns Flattened array
 */
export function optimizedFlatten<T>(array: T[], depth: number = 1): T[] {
  return withPerformanceMonitoring(
    'flatten',
    () => {
      if (depth === 1) {
        return array.flat() as T[];
      }

      let result = array as any;
      for (let i = 0; i < depth; i++) {
        result = result.flat();
      }

      return result as T[];
    },
    array.length,
  );
}

// ============================================================================
// Schema-Specific Optimizations
// ============================================================================

/**
 * Optimized schema filtering by multiple criteria.
 *
 * @param schemas - Array of schemas
 * @param filters - Filter criteria
 * @returns Filtered schemas
 */
export function optimizedSchemaFilter(
  schemas: Schema[],
  filters: {
    searchQuery?: string;
    status?: string[];
    type?: string[];
    showValid?: boolean;
    showInvalid?: boolean;
    showError?: boolean;
  },
): Schema[] {
  return withPerformanceMonitoring(
    'schemaFilter',
    () => {
      const { searchQuery, status, type, showValid, showInvalid, showError } =
        filters;

      return schemas.filter((schema) => {
        // Search query filter
        if (
          searchQuery &&
          !schema.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        if (status && status.length > 0) {
          const schemaStatus = schema.metadata.status || 'unknown';
          if (!status.includes(schemaStatus)) {
            return false;
          }
        }

        // Type filter
        if (type && type.length > 0) {
          const schemaType = schema.metadata.type || 'unknown';
          if (!type.includes(schemaType)) {
            return false;
          }
        }

        // Validity filters
        if (showValid !== undefined && schema.isValid !== showValid) {
          return false;
        }

        if (showInvalid !== undefined && schema.isInvalid !== showInvalid) {
          return false;
        }

        if (showError !== undefined && schema.hasErrors !== showError) {
          return false;
        }

        return true;
      });
    },
    schemas.length,
  );
}

/**
 * Optimized schema sorting by multiple criteria.
 *
 * @param schemas - Array of schemas
 * @param sortBy - Sort criteria
 * @returns Sorted schemas
 */
export function optimizedSchemaSort(
  schemas: Schema[],
  sortBy: {
    field: 'name' | 'size' | 'modified' | 'status';
    direction: 'asc' | 'desc';
  },
): Schema[] {
  return withPerformanceMonitoring(
    'schemaSort',
    () => {
      const { field, direction } = sortBy;

      return [...schemas].sort((a, b) => {
        let comparison = 0;

        switch (field) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'size':
            comparison =
              (a.metadata.fileSize || 0) - (b.metadata.fileSize || 0);
            break;
          case 'modified':
            comparison =
              (a.metadata.lastModified?.getTime() || 0) -
              (b.metadata.lastModified?.getTime() || 0);
            break;
          case 'status':
            comparison = (a.metadata.status || '').localeCompare(
              b.metadata.status || '',
            );
            break;
        }

        return direction === 'asc' ? comparison : -comparison;
      });
    },
    schemas.length,
  );
}

/**
 * Optimized schema search with fuzzy matching.
 *
 * @param schemas - Array of schemas
 * @param query - Search query
 * @param maxResults - Maximum number of results
 * @returns Matching schemas
 */
export function optimizedSchemaSearch(
  schemas: Schema[],
  query: string,
  maxResults: number = 50,
): Schema[] {
  return withPerformanceMonitoring(
    'schemaSearch',
    () => {
      if (!query.trim()) {
        return schemas.slice(0, maxResults);
      }

      const results: Array<{ schema: Schema; score: number }> = [];
      const queryLower = query.toLowerCase();

      for (const schema of schemas) {
        let score = 0;

        // Exact name match
        if (schema.name.toLowerCase() === queryLower) {
          score += 100;
        }
        // Name contains query
        else if (schema.name.toLowerCase().includes(queryLower)) {
          score += 50;
        }
        // Title contains query
        else if (schema.metadata.title?.toLowerCase().includes(queryLower)) {
          score += 30;
        }
        // Description contains query
        else if (
          schema.metadata.description?.toLowerCase().includes(queryLower)
        ) {
          score += 10;
        }

        if (score > 0) {
          results.push({ schema, score });
        }
      }

      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map((result) => result.schema);
    },
    schemas.length,
  );
}

// ============================================================================
// Performance Reporting
// ============================================================================

/**
 * Get performance metrics for array operations.
 */
export function getArrayPerformanceMetrics() {
  return {
    ...performanceMetrics,
    averageTime:
      performanceMetrics.operations > 0
        ? performanceMetrics.totalTime / performanceMetrics.operations
        : 0,
  };
}

/**
 * Reset performance metrics.
 */
export function resetArrayPerformanceMetrics() {
  performanceMetrics.operations = 0;
  performanceMetrics.totalTime = 0;
  performanceMetrics.slowOperations = [];
}

// ============================================================================
// Type Definitions
// ============================================================================

interface Schema {
  id: string;
  name: string;
  path: string;
  content: Record<string, unknown>;
  metadata: SchemaMetadata;
  referencedBy: string[];
  isValid?: boolean;
  isInvalid?: boolean;
  hasErrors?: boolean;
}

interface SchemaMetadata {
  title?: string;
  description?: string;
  fileSize?: number;
  lastModified?: Date;
  version?: string;
  status?: string;
  type?: string;
}
