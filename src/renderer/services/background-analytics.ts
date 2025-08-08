/**
 * Background analytics service for JSON Schema Editor.
 *
 * This service provides background processing for analytics computations,
 * improving UI responsiveness by offloading expensive operations.
 *
 * @module BackgroundAnalytics
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useBackgroundProcessing } from '../hooks/useBackgroundProcessing';
import { AnalyticsService } from './analytics';
import type { Schema } from '../../types/schema-editor';
import type {
  AnalyticsResult,
  CircularReference,
  ComplexityMetrics,
  ReferenceGraph,
} from './analytics';
import logger from '../lib/renderer-logger';

/**
 * Background analytics task types.
 */
type AnalyticsTaskType =
  | 'circular-references'
  | 'complexity-metrics'
  | 'reference-graph'
  | 'project-metrics'
  | 'full-analysis';

/**
 * Background analytics task input.
 */
interface AnalyticsTaskInput {
  schemas: Schema[];
  options?: {
    includeDetails?: boolean;
    maxDepth?: number;
    enableCaching?: boolean;
  };
}

/**
 * Background analytics result for specific task types.
 */
interface BackgroundAnalyticsResult {
  circularReferences?: CircularReference[];
  complexityMetrics?: Map<string, ComplexityMetrics>;
  referenceGraph?: ReferenceGraph;

  fullAnalysis?: AnalyticsResult;
}

/**
 * Background analytics service state.
 */
interface BackgroundAnalyticsState {
  /** Current analysis results */
  results: BackgroundAnalyticsResult;
  /** Whether any analysis is in progress */
  isAnalyzing: boolean;
  /** Current analysis progress (0-100) */
  progress: number;
  /** Analysis error if any */
  error: string | null;
  /** Last analysis timestamp */
  lastAnalysis: Date | null;
  /** Analysis performance metrics */
  metrics: {
    totalAnalyses: number;
    averageDuration: number;
    cacheHitRate: number;
  };
}

/**
 * Hook for background analytics functionality.
 *
 * Provides efficient background processing of schema analytics with
 * progress tracking, caching, and performance monitoring.
 *
 * @param schemas - Array of schemas to analyze
 * @param options - Analysis configuration options
 * @returns Background analytics utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   results,
 *   isAnalyzing,
 *   progress,
 *   analyzeCircularReferences,
 *   analyzeComplexity,
 *   analyzeAll
 * } = useBackgroundAnalytics(schemas, {
 *   autoAnalyze: true,
 *   debounceDelay: 1000
 * });
 * ```
 */
export function useBackgroundAnalytics(
  schemas: Schema[],
  options: {
    /** Enable automatic analysis when schemas change */
    autoAnalyze?: boolean;
    /** Debounce delay for auto analysis in milliseconds */
    debounceDelay?: number;
    /** Enable result caching */
    enableCaching?: boolean;
    /** Maximum number of concurrent analysis tasks */
    maxConcurrency?: number;
  } = {},
): {
  results: BackgroundAnalyticsResult;
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  lastAnalysis: Date | null;
  metrics: BackgroundAnalyticsState['metrics'];
  analyzeCircularReferences: () => Promise<void>;
  analyzeComplexity: () => Promise<void>;
  analyzeReferenceGraph: () => Promise<void>;

  analyzeAll: () => Promise<void>;
  cancelAnalysis: () => void;
  clearResults: () => void;
} {
  const {
    autoAnalyze = false,
    debounceDelay = 1000,
    enableCaching = true,
    maxConcurrency = 3,
  } = options;

  const [state, setState] = useState<BackgroundAnalyticsState>({
    results: {},
    isAnalyzing: false,
    progress: 0,
    error: null,
    lastAnalysis: null,
    metrics: {
      totalAnalyses: 0,
      averageDuration: 0,
      cacheHitRate: 0,
    },
  });

  // Store interval and timeout IDs for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    addTask,
    getResult,
    clearTasks,
    isProcessing,
    overallProgress,
    metrics,
  } = useBackgroundProcessing({
    maxConcurrency,
  });

  /**
   * Create analytics processor for specific task type.
   */
  const createAnalyticsProcessor = useCallback(
    (taskType: AnalyticsTaskType) => {
      return async (input: AnalyticsTaskInput): Promise<unknown> => {
        const startTime = Date.now();
        logger.info('Starting analytics processing', {
          taskType,
          schemaCount: input.schemas.length,
        });

        try {
          const analyticsService = new AnalyticsService();

          switch (taskType) {
            case 'circular-references':
              return analyticsService.detectCircularReferences(input.schemas);
            case 'complexity-metrics':
              return analyticsService.calculateComplexityMetrics(input.schemas);
            case 'reference-graph':
              return analyticsService.buildReferenceGraph(input.schemas);
            case 'project-metrics': {
              const complexityMetrics =
                analyticsService.calculateComplexityMetrics(input.schemas);
              const circularReferences =
                analyticsService.detectCircularReferences(input.schemas);
              return analyticsService.calculateProjectMetrics(
                input.schemas,
                complexityMetrics,
                circularReferences,
              );
            }
            case 'full-analysis':
              return await analyticsService.analyzeSchemas(input.schemas);
            default:
              throw new Error(`Unknown task type: ${taskType}`);
          }
        } catch (error) {
          logger.error('Analytics processing failed', { taskType, error });
          throw error;
        } finally {
          const duration = Date.now() - startTime;
          logger.info('Analytics processing completed', { taskType, duration });
        }
      };
    },
    [],
  );

  /**
   * Update analysis result for specific task type.
   */
  const updateResult = useCallback(
    (taskType: AnalyticsTaskType, result: unknown) => {
      setState((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          [taskType]: result,
        },
        lastAnalysis: new Date(),
        metrics: {
          ...prev.metrics,
          totalAnalyses: prev.metrics.totalAnalyses + 1,
        },
      }));
    },
    [],
  );

  /**
   * Execute analysis task.
   */
  const executeAnalysis = useCallback(
    async (
      taskType: AnalyticsTaskType,
      priority: number = 0,
    ): Promise<void> => {
      if (schemas.length === 0) {
        logger.warn('No schemas provided for analysis');
        return;
      }

      // Clear any existing intervals/timeouts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const taskId = `${taskType}-${Date.now()}`;

      setState((prev) => ({ ...prev, error: null }));

      addTask({
        id: taskId,
        input: { schemas, options: { enableCaching } },
        processor: createAnalyticsProcessor(taskType),
        priority,
        timeout: taskType === 'full-analysis' ? 120000 : 60000, // 2 minutes for full analysis
      });

      // Poll for result
      intervalRef.current = setInterval(() => {
        const result = getResult(taskId);

        if (result?.status === 'completed' && result.result) {
          updateResult(taskType, result.result);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (result?.status === 'error') {
          setState((prev) => ({
            ...prev,
            error: result.error || 'Analysis failed',
          }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (result?.status === 'cancelled') {
          setState((prev) => ({ ...prev, error: 'Analysis was cancelled' }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 100);

      // Cleanup after 5 minutes
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 300000) as any;
    },
    [
      schemas,
      enableCaching,
      addTask,
      createAnalyticsProcessor,
      getResult,
      updateResult,
    ],
  );

  /**
   * Individual analysis functions.
   */
  const analyzeCircularReferences = useCallback(
    () => executeAnalysis('circular-references', 1),
    [executeAnalysis],
  );

  const analyzeComplexity = useCallback(
    () => executeAnalysis('complexity-metrics', 2),
    [executeAnalysis],
  );

  const analyzeReferenceGraph = useCallback(
    () => executeAnalysis('reference-graph', 2),
    [executeAnalysis],
  );

  const analyzeAll = useCallback(
    () => executeAnalysis('full-analysis', 0),
    [executeAnalysis],
  );

  /**
   * Cancel all analysis tasks.
   */
  const cancelAnalysis = useCallback(() => {
    clearTasks();
    setState((prev) => ({ ...prev, error: 'Analysis cancelled' }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [clearTasks]);

  /**
   * Clear all results.
   */
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      results: {},
      error: null,
      lastAnalysis: null,
    }));
  }, []);

  /**
   * Auto-analyze when schemas change.
   */
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoAnalyze || schemas.length === 0) return;

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced analysis
    debounceRef.current = window.setTimeout(() => {
      logger.info('Auto-analyzing schemas', { count: schemas.length });
      analyzeAll();
    }, debounceDelay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [schemas, autoAnalyze, debounceDelay, analyzeAll]);

  /**
   * Update processing state.
   */
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isAnalyzing: isProcessing,
      progress: overallProgress,
      metrics: {
        ...prev.metrics,
        averageDuration: metrics.averageDuration,
      },
    }));
  }, [isProcessing, overallProgress, metrics]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      clearTasks();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [debounceRef, clearTasks]);

  return {
    results: state.results,
    isAnalyzing: state.isAnalyzing,
    progress: state.progress,
    error: state.error,
    lastAnalysis: state.lastAnalysis,
    metrics: state.metrics,
    analyzeCircularReferences,
    analyzeComplexity,
    analyzeReferenceGraph,

    analyzeAll,
    cancelAnalysis,
    clearResults,
  };
}
