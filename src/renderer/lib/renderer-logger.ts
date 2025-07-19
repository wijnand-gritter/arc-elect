/**
 * Renderer process logger using electron-log.
 *
 * This module provides a centralized logging system for the renderer process
 * using electron-log. It includes automatic log rotation, file storage,
 * and console output for development.
 *
 * @module renderer-logger
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from 'electron-log/renderer';
import { BaseLogger, LogLevel } from '../../shared/base-logger';

const levelToConsole: Record<LogLevel, keyof Console> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  verbose: 'log',
  silly: 'log',
};

class RendererLogger extends BaseLogger {
  protected logImpl(level: LogLevel, message: unknown, ...args: unknown[]) {
    (logger as unknown as Record<string, (...args: unknown[]) => void>)[level](message, ...args);
  }
  protected consoleTransport(level: LogLevel, fmt: string, ...fmtArgs: unknown[]) {
    const fn = console[levelToConsole[level]];
    if (typeof fn === 'function') {
      (fn as (...args: unknown[]) => void).call(console, fmt, ...fmtArgs);
    }
  }
}

export function getLogger(context: string) {
  return new RendererLogger(context);
}

/**
 * Renderer process logger instance.
 *
 * This logger provides the following features:
 * - Automatic log rotation
 * - File storage in app data directory
 * - Console output for development
 * - Structured logging with timestamps
 * - Error tracking and reporting
 *
 * @example
 * ```ts
 * import logger from './renderer-logger';
 *
 * logger.info('Component mounted');
 * logger.error('An error occurred', error);
 * logger.warn('Warning message');
 * logger.debug('Debug information');
 * ```
 */
export default logger;
