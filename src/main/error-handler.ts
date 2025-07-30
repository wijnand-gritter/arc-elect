/**
 * Global error handling for main process.
 *
 * This module provides global error handlers for uncaught exceptions
 * and unhandled promise rejections, plus utilities for wrapping IPC
 * handlers with standardized error handling and logging.
 *
 * @module error-handler
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from './main-logger';

/**
 * Standardized error response format for IPC handlers.
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Standardized success response format for IPC handlers.
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standardized IPC response type.
 */
export type IpcResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Wraps an IPC handler with standardized error handling.
 *
 * This function provides consistent error handling, logging, and response
 * formatting for all IPC handlers in the main process.
 *
 * @param handler - The IPC handler function to wrap
 * @param context - Context information for logging
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```typescript
 * ipcMain.handle('api:action', withErrorHandling(async (event, data) => {
 *   // Your handler logic here
 *   return result;
 * }, 'api:action'));
 * ```
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context: string,
): (...args: T) => Promise<IpcResponse<R>> {
  return async (...args: T): Promise<IpcResponse<R>> => {
    const startTime = Date.now();

    try {
      logger.info(`${context} - START`, { args: args.length });

      const result = await handler(...args);

      logger.info(`${context} - SUCCESS`, {
        duration: Date.now() - startTime,
        resultType: typeof result,
      });

      return { success: true, data: result };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const duration = Date.now() - startTime;

      logger.error(`${context} - FAILED`, {
        error: errorObj.message,
        stack: errorObj.stack,
        duration,
        args: args.length,
      });

      return {
        success: false,
        error: errorObj.message,
        code: errorObj.name,
        details: process.env.NODE_ENV === 'development' ? errorObj.stack : undefined,
      };
    }
  };
}

/**
 * Validates input parameters for IPC handlers.
 *
 * This function provides consistent input validation for all IPC handlers
 * to ensure data integrity and security.
 *
 * @param value - The value to validate
 * @param type - Expected type
 * @param maxLength - Maximum length for strings
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const validation = validateInput(data, 'string', 512);
 * if (!validation.valid) {
 *   throw new Error(validation.error);
 * }
 * ```
 */
export function validateInput(
  value: unknown,
  type: 'string' | 'number' | 'object',
  maxLength?: number,
): { valid: true } | { valid: false; error: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Required parameter is missing' };
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Parameter must be a string' };
      }
      if (maxLength && value.length > maxLength) {
        return { valid: false, error: `String too long (max ${maxLength} characters)` };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Parameter must be a valid number' };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null) {
        return { valid: false, error: 'Parameter must be an object' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Handle uncaught exceptions.
 *
 * This ensures that any unhandled exceptions are properly logged
 * before the application exits.
 */
process.on('uncaughtException', (error) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };

  logger.error('Uncaught Exception:', errorInfo);

  // Give logger time to flush before exit
  setTimeout(() => process.exit(1), 100);
});

/**
 * Handle unhandled promise rejections.
 *
 * This ensures that any unhandled promise rejections are properly
 * logged before the application exits.
 */
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    promise: promise.toString(),
  };

  logger.error('Unhandled Promise Rejection:', errorInfo);

  // Give logger time to flush before exit
  setTimeout(() => process.exit(1), 100);
});
