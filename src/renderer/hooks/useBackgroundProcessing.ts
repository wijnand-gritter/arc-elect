/**
 * Background processing hook for performance optimization.
 *
 * This hook provides background processing functionality to offload
 * expensive computations from the main thread, improving UI responsiveness.
 *
 * @module useBackgroundProcessing
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Background task status.
 */
type TaskStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

/**
 * Background task definition.
 */
interface BackgroundTask<TInput, TOutput> {
  /** Unique task identifier */
  id: string;
  /** Task input data */
  input: TInput;
  /** Task processing function */
  processor: (input: TInput, signal?: AbortSignal) => Promise<TOutput>;
  /** Task priority (lower number = higher priority) */
  priority?: number;
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Task dependencies (must complete before this task) */
  dependencies?: string[];
}

/**
 * Background task result.
 */
interface TaskResult<TOutput> {
  /** Task identifier */
  id: string;
  /** Task status */
  status: TaskStatus;
  /** Task result data */
  result?: TOutput;
  /** Task error if failed */
  error?: string;
  /** Task execution duration in milliseconds */
  duration?: number;
  /** Task progress (0-100) */
  progress?: number;
}

/**
 * Background processing options.
 */
interface BackgroundProcessingOptions {
  /** Maximum number of concurrent tasks */
  maxConcurrency?: number;
  /** Enable task queue management */
  enableQueue?: boolean;
  /** Enable task scheduling based on priority */
  enableScheduling?: boolean;
  /** Default task timeout in milliseconds */
  defaultTimeout?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Idle callback for cleanup */
  onIdle?: () => void;
}

/**
 * Background processing result.
 */
interface BackgroundProcessingResult {
  /** Current task results by ID */
  results: Map<string, TaskResult<any>>;
  /** Current task queue */
  queue: BackgroundTask<any, any>[];
  /** Currently running tasks */
  running: BackgroundTask<any, any>[];
  /** Whether any tasks are running */
  isProcessing: boolean;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Function to add a task to the queue */
  addTask: <TInput, TOutput>(task: BackgroundTask<TInput, TOutput>) => void;
  /** Function to cancel a task */
  cancelTask: (taskId: string) => void;
  /** Function to clear all tasks */
  clearTasks: () => void;
  /** Function to pause processing */
  pause: () => void;
  /** Function to resume processing */
  resume: () => void;
  /** Whether processing is paused */
  isPaused: boolean;
  /** Function to get task result */
  getResult: <TOutput>(taskId: string) => TaskResult<TOutput> | undefined;
  /** Performance metrics */
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
    throughput: number;
  };
}

/**
 * Hook for background processing functionality.
 *
 * Provides efficient background processing with task queuing, priority scheduling,
 * and performance monitoring.
 *
 * @param options - Background processing configuration
 * @returns Background processing utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   addTask,
 *   results,
 *   isProcessing,
 *   getResult
 * } = useBackgroundProcessing({
 *   maxConcurrency: 3,
 *   enableQueue: true,
 *   enableScheduling: true
 * });
 *
 * // Add analytics processing task
 * addTask({
 *   id: 'analytics-circular-refs',
 *   input: schemas,
 *   processor: async (schemas) => analyzeCircularReferences(schemas),
 *   priority: 1
 * });
 * ```
 */
export function useBackgroundProcessing(
  options: BackgroundProcessingOptions = {},
): BackgroundProcessingResult {
  const {
    maxConcurrency = 3,
    enableQueue = true,
    enableScheduling = true,
    defaultTimeout = 30000,
    enableMonitoring = true,
    onIdle,
  } = options;

  const [results, setResults] = useState<Map<string, TaskResult<any>>>(
    new Map(),
  );
  const [queue, setQueue] = useState<BackgroundTask<any, any>[]>([]);
  const [running, setRunning] = useState<BackgroundTask<any, any>[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const metricsRef = useRef({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalDuration: 0,
    startTime: Date.now(),
  });

  /**
   * Calculate overall progress.
   */
  const overallProgress = useMemo(() => {
    if (metricsRef.current.totalTasks === 0) return 0;

    const completed =
      metricsRef.current.completedTasks + metricsRef.current.failedTasks;
    return Math.round((completed / metricsRef.current.totalTasks) * 100);
  }, [results]);

  /**
   * Calculate performance metrics.
   */
  const metrics = useMemo(() => {
    const {
      totalTasks,
      completedTasks,
      failedTasks,
      totalDuration,
      startTime,
    } = metricsRef.current;
    const elapsed = (Date.now() - startTime) / 1000; // seconds

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      averageDuration: completedTasks > 0 ? totalDuration / completedTasks : 0,
      throughput: elapsed > 0 ? completedTasks / elapsed : 0,
    };
  }, [results]);

  /**
   * Check if currently processing tasks.
   */
  const isProcessing = running.length > 0 || queue.length > 0;

  /**
   * Execute a single task.
   */
  const executeTask = useCallback(
    async <TInput, TOutput>(
      task: BackgroundTask<TInput, TOutput>,
    ): Promise<void> => {
      const { id, input, processor, timeout = defaultTimeout } = task;
      const abortController = new AbortController();
      abortControllersRef.current.set(id, abortController);

      // Update task status to running
      setResults(
        (prev) =>
          new Map(
            prev.set(id, {
              id,
              status: 'running',
              progress: 0,
            }),
          ),
      );

      const startTime = Date.now();
      let timeoutId: NodeJS.Timeout | undefined;

      try {
        // Set up timeout
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            abortController.abort('Task timeout');
          }, timeout);
        }

        // Execute the task
        const result = await processor(input, abortController.signal);
        const duration = Date.now() - startTime;

        // Update metrics
        if (enableMonitoring) {
          metricsRef.current.completedTasks++;
          metricsRef.current.totalDuration += duration;
        }

        // Update task result
        setResults(
          (prev) =>
            new Map(
              prev.set(id, {
                id,
                status: 'completed',
                result,
                duration,
                progress: 100,
              }),
            ),
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Update metrics
        if (enableMonitoring) {
          metricsRef.current.failedTasks++;
        }

        // Update task result
        setResults(
          (prev) =>
            new Map(
              prev.set(id, {
                id,
                status: abortController.signal.aborted ? 'cancelled' : 'error',
                error: errorMessage,
                duration,
                progress: 0,
              }),
            ),
        );
      } finally {
        // Cleanup
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        abortControllersRef.current.delete(id);

        // Remove from running tasks
        setRunning((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [defaultTimeout, enableMonitoring],
  );

  /**
   * Process task queue.
   */
  const processQueue = useCallback(async (): Promise<void> => {
    if (isPaused || running.length >= maxConcurrency || queue.length === 0) {
      return;
    }

    setQueue((prev) => {
      const nextQueue = [...prev];
      const availableSlots = maxConcurrency - running.length;

      // Sort by priority if scheduling is enabled
      if (enableScheduling) {
        nextQueue.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }

      // Check dependencies
      const readyTasks = nextQueue.filter((task) => {
        if (!task.dependencies || task.dependencies.length === 0) {
          return true;
        }

        return task.dependencies.every((depId) => {
          const result = results.get(depId);
          return result && result.status === 'completed';
        });
      });

      // Take tasks up to available slots
      const tasksToRun = readyTasks.slice(0, availableSlots);

      // Update running tasks
      if (tasksToRun.length > 0) {
        setRunning((prev) => [...prev, ...tasksToRun]);

        // Execute tasks
        tasksToRun.forEach((task) => {
          executeTask(task);
        });
      }

      // Remove tasks from queue
      return nextQueue.filter((task) => !tasksToRun.includes(task));
    });
  }, [
    isPaused,
    running.length,
    maxConcurrency,
    queue.length,
    enableScheduling,
    results,
    executeTask,
  ]);

  /**
   * Add a task to the queue.
   */
  const addTask = useCallback(
    <TInput, TOutput>(task: BackgroundTask<TInput, TOutput>): void => {
      // Update metrics
      if (enableMonitoring) {
        metricsRef.current.totalTasks++;
      }

      // Initialize task result
      setResults(
        (prev) =>
          new Map(
            prev.set(task.id, {
              id: task.id,
              status: 'idle',
              progress: 0,
            }),
          ),
      );

      // Add to queue if enabled, otherwise execute immediately
      if (enableQueue) {
        setQueue((prev) => {
          // Check if task already exists
          const exists = prev.some((t) => t.id === task.id);
          if (exists) {
            return prev.map((t) => (t.id === task.id ? task : t));
          }
          return [...prev, task];
        });
      } else {
        // Execute immediately if under concurrency limit
        if (running.length < maxConcurrency) {
          setRunning((prev) => [...prev, task]);
          executeTask(task);
        } else {
          // Add to queue as fallback
          setQueue((prev) => [...prev, task]);
        }
      }
    },
    [
      enableQueue,
      enableMonitoring,
      running.length,
      maxConcurrency,
      executeTask,
    ],
  );

  /**
   * Cancel a task.
   */
  const cancelTask = useCallback((taskId: string): void => {
    const abortController = abortControllersRef.current.get(taskId);
    if (abortController) {
      abortController.abort('Task cancelled by user');
    }

    // Remove from queue
    setQueue((prev) => prev.filter((task) => task.id !== taskId));

    // Update result status
    setResults((prev) => {
      const result = prev.get(taskId);
      if (result && result.status === 'running') {
        return new Map(
          prev.set(taskId, {
            ...result,
            status: 'cancelled',
          }),
        );
      }
      return prev;
    });
  }, []);

  /**
   * Clear all tasks.
   */
  const clearTasks = useCallback((): void => {
    // Cancel all running tasks
    abortControllersRef.current.forEach((controller) => {
      controller.abort('All tasks cancelled');
    });
    abortControllersRef.current.clear();

    // Clear state
    setQueue([]);
    setRunning([]);
    setResults(new Map());

    // Reset metrics
    metricsRef.current = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalDuration: 0,
      startTime: Date.now(),
    };
  }, []);

  /**
   * Pause processing.
   */
  const pause = useCallback((): void => {
    setIsPaused(true);
  }, []);

  /**
   * Resume processing.
   */
  const resume = useCallback((): void => {
    setIsPaused(false);
  }, []);

  /**
   * Get task result by ID.
   */
  const getResult = useCallback(
    <TOutput>(taskId: string): TaskResult<TOutput> | undefined => {
      return results.get(taskId) as TaskResult<TOutput> | undefined;
    },
    [results],
  );

  /**
   * Process queue when state changes.
   */
  useEffect(() => {
    if (!isPaused) {
      processQueue();
    }
  }, [isPaused, queue.length, running.length, processQueue]);

  /**
   * Call idle callback when no tasks are running.
   */
  useEffect(() => {
    if (!isProcessing && onIdle) {
      const timeoutId = setTimeout(onIdle, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isProcessing, onIdle]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      clearTasks();
    };
  }, [clearTasks]);

  return {
    results,
    queue,
    running,
    isProcessing,
    overallProgress,
    addTask,
    cancelTask,
    clearTasks,
    pause,
    resume,
    isPaused,
    getResult,
    metrics,
  };
}
