/**
 * Error handling utilities for the renderer process.
 *
 * This module provides utilities for safe error handling in event handlers
 * and other user interactions. It includes functions for wrapping event
 * handlers with error catching and logging.
 *
 * @module error-handling
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { toast } from 'sonner';
import logger from './renderer-logger';

/**
 * Wraps a function with error handling and logging.
 *
 * This function wraps an event handler or other function with error
 * catching, logging, and user notification. It prevents unhandled
 * errors from crashing the application and provides user feedback.
 *
 * @param fn - The function to wrap with error handling
 * @returns A new function that includes error handling
 *
 * @example
 * ```tsx
 * <button onClick={safeHandler(() => {
 *   // This function is now protected from errors
 *   throw new Error('Something went wrong');
 * })}>
 *   Click me
 * </button>
 * ```
 */
export function safeHandler<T extends (...args: any[]) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | void {
  return (...args: Parameters<T>): ReturnType<T> | void => {
    try {
      return fn(...args) as ReturnType<T>;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error in safeHandler', {
        error: errorObj.message,
        stack: errorObj.stack,
      });

      // Show user-friendly error message
      toast.error('An error occurred', {
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  };
}

/**
 * Wraps an async function with error handling and logging.
 *
 * This function wraps an async event handler or other async function
 * with error catching, logging, and user notification. It handles both
 * synchronous errors and promise rejections.
 *
 * @param fn - The async function to wrap with error handling
 * @returns A new async function that includes error handling
 *
 * @example
 * ```tsx
 * <button onClick={safeAsyncHandler(async () => {
 *   // This async function is now protected from errors
 *   await someAsyncOperation();
 * })}>
 *   Click me
 * </button>
 * ```
 */
export function safeAsyncHandler<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | void> {
  return async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>> | void> => {
    try {
      return (await fn(...args)) as Awaited<ReturnType<T>>;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Error in safeAsyncHandler', {
        error: errorObj.message,
        stack: errorObj.stack,
      });

      // Show user-friendly error message
      toast.error('An error occurred', {
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  };
}
