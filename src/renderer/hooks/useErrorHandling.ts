/**
 * Enhanced error handling hook for JSON Schema Editor.
 *
 * This hook provides comprehensive error handling including error boundaries,
 * retry mechanisms, user notifications, and error reporting.
 *
 * @module useErrorHandling
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import logger from '../lib/renderer-logger';

/**
 * Error severity levels.
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories.
 */
export type ErrorCategory =
  | 'validation'
  | 'network'
  | 'file-system'
  | 'parsing'
  | 'permission'
  | 'memory'
  | 'timeout'
  | 'unknown';

/**
 * Enhanced error with additional metadata.
 */
export interface EnhancedError extends Error {
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Error code for identification */
  code?: string;
  /** Context where error occurred */
  context?: Record<string, any>;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested user actions */
  userActions?: string[];
  /** Technical details for debugging */
  technicalDetails?: Record<string, any>;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Retry options.
 */
interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Delay between retries in milliseconds */
  delay: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Condition to determine if error is retryable */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback for retry attempts */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Error handling options.
 */
interface ErrorHandlingOptions {
  /** Whether to show toast notifications for errors */
  showToasts: boolean;
  /** Whether to log errors automatically */
  logErrors: boolean;
  /** Whether to report errors to external service */
  reportErrors: boolean;
  /** Default retry options */
  defaultRetryOptions: Partial<RetryOptions>;
  /** Error categorization rules */
  categorizationRules: Record<string, ErrorCategory>;
}

/**
 * Error handling result.
 */
interface ErrorHandlingResult {
  /** Current error state */
  error: EnhancedError | null;
  /** Whether currently retrying an operation */
  isRetrying: boolean;
  /** Current retry attempt number */
  retryAttempt: number;
  /** Function to handle errors */
  handleError: (error: Error, context?: Record<string, any>) => EnhancedError;
  /** Function to clear current error */
  clearError: () => void;
  /** Function to execute with error handling */
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>,
  ) => Promise<T>;
  /** Function to create safe handler for events */
  createSafeHandler: <T extends any[]>(
    handler: (...args: T) => Promise<void> | void,
    options?: { context?: Record<string, any> },
  ) => (...args: T) => Promise<void>;
  /** Function to enhance existing error */
  enhanceError: (
    error: Error,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context?: Record<string, any>,
  ) => EnhancedError;
  /** Function to check if error is recoverable */
  isRecoverable: (error: Error) => boolean;
  /** Function to suggest user actions */
  suggestActions: (error: EnhancedError) => string[];
}

const DEFAULT_OPTIONS: ErrorHandlingOptions = {
  showToasts: true,
  logErrors: true,
  reportErrors: false,
  defaultRetryOptions: {
    maxAttempts: 3,
    delay: 1000,
    exponentialBackoff: true,
  },
  categorizationRules: {
    'fetch failed': 'network',
    ENOENT: 'file-system',
    EACCES: 'permission',
    SyntaxError: 'parsing',
    ValidationError: 'validation',
    TimeoutError: 'timeout',
    OutOfMemoryError: 'memory',
  },
};

/**
 * Hook for enhanced error handling.
 *
 * Provides comprehensive error handling with categorization, retry mechanisms,
 * user notifications, and recovery suggestions.
 *
 * @param options - Error handling configuration
 * @returns Error handling utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   error,
 *   handleError,
 *   clearError,
 *   withErrorHandling,
 *   createSafeHandler
 * } = useErrorHandling({
 *   showToasts: true,
 *   logErrors: true
 * });
 *
 * // Handle async operations with retry
 * const loadData = withErrorHandling(async () => {
 *   const data = await api.fetchData();
 *   return data;
 * }, { maxAttempts: 3 });
 *
 * // Create safe event handler
 * const handleClick = createSafeHandler(async () => {
 *   await performAction();
 * }, { context: { component: 'Button', action: 'click' } });
 * ```
 */
export function useErrorHandling(options: Partial<ErrorHandlingOptions> = {}): ErrorHandlingResult {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [error, setError] = useState<EnhancedError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const errorHistoryRef = useRef<EnhancedError[]>([]);

  /**
   * Categorize error based on message and type.
   */
  const categorizeError = useCallback(
    (error: Error): ErrorCategory => {
      const message = error.message.toLowerCase();

      for (const [pattern, category] of Object.entries(config.categorizationRules)) {
        if (message.includes(pattern.toLowerCase())) {
          return category;
        }
      }

      // Check constructor name
      switch (error.constructor.name) {
        case 'TypeError':
        case 'SyntaxError':
          return 'parsing';
        case 'ReferenceError':
          return 'validation';
        case 'NetworkError':
          return 'network';
        case 'TimeoutError':
          return 'timeout';
        default:
          return 'unknown';
      }
    },
    [config.categorizationRules],
  );

  /**
   * Determine error severity.
   */
  const determineSeverity = useCallback((error: Error, category: ErrorCategory): ErrorSeverity => {
    // Critical errors that prevent app from functioning
    if (
      category === 'memory' ||
      error.message.includes('out of memory') ||
      error.message.includes('heap out of memory')
    ) {
      return 'critical';
    }

    // High severity errors that affect core functionality
    if (
      category === 'file-system' ||
      category === 'permission' ||
      error.message.includes('EACCES') ||
      error.message.includes('EPERM')
    ) {
      return 'high';
    }

    // Medium severity errors that affect user experience
    if (category === 'network' || category === 'timeout' || category === 'validation') {
      return 'medium';
    }

    // Low severity errors that are recoverable
    return 'low';
  }, []);

  /**
   * Check if error is recoverable.
   */
  const isRecoverable = useCallback((error: Error): boolean => {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    const nonRecoverablePatterns = [
      'out of memory',
      'heap out of memory',
      'maximum call stack',
      'eacces',
      'eperm',
      'syntax error',
    ];

    return !nonRecoverablePatterns.some((pattern) => message.includes(pattern));
  }, []);

  /**
   * Suggest user actions based on error.
   */
  const suggestActions = useCallback((error: EnhancedError): string[] => {
    const actions: string[] = [];

    switch (error.category) {
      case 'network':
        actions.push(
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if problem persists',
        );
        break;

      case 'file-system':
        actions.push(
          'Check if the file exists',
          'Verify file permissions',
          'Try selecting a different file',
        );
        break;

      case 'permission':
        actions.push(
          'Check file permissions',
          'Run as administrator if needed',
          'Select a different location',
        );
        break;

      case 'validation':
        actions.push(
          'Check the schema format',
          'Fix validation errors',
          'Refer to JSON Schema documentation',
        );
        break;

      case 'parsing':
        actions.push('Check JSON syntax', 'Remove invalid characters', 'Use a JSON validator');
        break;

      case 'memory':
        actions.push(
          'Close other applications',
          'Restart the application',
          'Work with smaller datasets',
        );
        break;

      case 'timeout':
        actions.push(
          'Try again with smaller datasets',
          'Check system performance',
          'Increase timeout settings',
        );
        break;

      default:
        actions.push('Try again', 'Restart the application', 'Contact support with error details');
    }

    return actions;
  }, []);

  /**
   * Enhance error with additional metadata.
   */
  const enhanceError = useCallback(
    (
      error: Error,
      severity?: ErrorSeverity,
      category?: ErrorCategory,
      context?: Record<string, any>,
    ): EnhancedError => {
      const errorCategory = category || categorizeError(error);
      const errorSeverity = severity || determineSeverity(error, errorCategory);

      const enhanced: EnhancedError = {
        ...error,
        name: error.name,
        message: error.message,
        stack: error.stack,
        severity: errorSeverity,
        category: errorCategory,
        recoverable: isRecoverable(error),
        context: context || {},
        timestamp: new Date(),
        technicalDetails: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          ...context,
        },
      };

      enhanced.userActions = suggestActions(enhanced);

      return enhanced;
    },
    [categorizeError, determineSeverity, isRecoverable, suggestActions],
  );

  /**
   * Handle error with logging and notifications.
   */
  const handleError = useCallback(
    (error: Error, context?: Record<string, any>): EnhancedError => {
      const enhanced = enhanceError(error, undefined, undefined, context);

      // Log error
      if (config.logErrors) {
        logger.error('Error handled', {
          error: enhanced.message,
          severity: enhanced.severity,
          category: enhanced.category,
          stack: enhanced.stack,
          context: enhanced.context,
          technicalDetails: enhanced.technicalDetails,
        });
      }

      // Show toast notification
      if (config.showToasts) {
        const toastOptions = {
          description: enhanced.userActions?.[0] || 'Please try again',
          duration: enhanced.severity === 'critical' ? 0 : 5000,
        };

        switch (enhanced.severity) {
          case 'critical':
            toast.error(`Critical Error: ${enhanced.message}`, toastOptions);
            break;
          case 'high':
            toast.error(enhanced.message, toastOptions);
            break;
          case 'medium':
            toast.warning(enhanced.message, toastOptions);
            break;
          case 'low':
            toast.info(enhanced.message, toastOptions);
            break;
        }
      }

      // Store in history
      errorHistoryRef.current.push(enhanced);

      // Keep only last 100 errors
      if (errorHistoryRef.current.length > 100) {
        errorHistoryRef.current = errorHistoryRef.current.slice(-100);
      }

      // Set current error
      setError(enhanced);

      return enhanced;
    },
    [config.logErrors, config.showToasts, enhanceError],
  );

  /**
   * Clear current error.
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryAttempt(0);
  }, []);

  /**
   * Execute operation with retry logic.
   */
  const withErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>, retryOptions?: Partial<RetryOptions>): Promise<T> => {
      const options: RetryOptions = {
        ...config.defaultRetryOptions,
        ...retryOptions,
      } as RetryOptions;

      let lastError: Error;
      let attempt = 0;

      while (attempt < options.maxAttempts) {
        try {
          if (attempt > 0) {
            setIsRetrying(true);
            setRetryAttempt(attempt);

            // Calculate delay with exponential backoff
            const delay = options.exponentialBackoff
              ? options.delay * Math.pow(2, attempt - 1)
              : options.delay;

            await new Promise((resolve) => setTimeout(resolve, delay));

            options.onRetry?.(lastError!, attempt);
          }

          const result = await operation();

          // Success - clear retry state
          setIsRetrying(false);
          setRetryAttempt(0);

          return result;
        } catch (error) {
          lastError = error as Error;
          attempt++;

          // Check if we should retry
          if (
            attempt >= options.maxAttempts ||
            (options.shouldRetry && !options.shouldRetry(lastError, attempt))
          ) {
            break;
          }
        }
      }

      // All retries failed
      setIsRetrying(false);
      setRetryAttempt(0);

      const enhanced = handleError(lastError!, {
        operation: operation.name || 'anonymous',
        attempts: attempt,
        maxAttempts: options.maxAttempts,
      });

      throw enhanced;
    },
    [config.defaultRetryOptions, handleError],
  );

  /**
   * Create safe event handler that catches and handles errors.
   */
  const createSafeHandler = useCallback(
    <T extends any[]>(
      handler: (...args: T) => Promise<void> | void,
      options?: { context?: Record<string, any> },
    ) => {
      return async (...args: T): Promise<void> => {
        try {
          await handler(...args);
        } catch (error) {
          handleError(error as Error, {
            handler: handler.name || 'anonymous',
            args: args.length,
            ...options?.context,
          });
        }
      };
    },
    [handleError],
  );

  return {
    error,
    isRetrying,
    retryAttempt,
    handleError,
    clearError,
    withErrorHandling,
    createSafeHandler,
    enhanceError,
    isRecoverable,
    suggestActions,
  };
}
