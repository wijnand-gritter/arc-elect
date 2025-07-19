/**
 * Main process logger using electron-log.
 *
 * This module provides a centralized logging system for the main process
 * using electron-log. It includes automatic log rotation, file storage,
 * and console output for development.
 *
 * @module main-logger
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from 'electron-log';

// Initialize the logger for the main process
logger.initialize();

/**
 * Main process logger instance.
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
 * import logger from './main-logger';
 *
 * logger.info('Application started');
 * logger.error('An error occurred', error);
 * logger.warn('Warning message');
 * logger.debug('Debug information');
 * ```
 */
export default logger;
