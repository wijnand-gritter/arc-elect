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

let exportedLogger: {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

try {
  // Prefer explicit main-process logger to ensure initialization
  // Lazy require to avoid ESM interop issues in CLI/node context
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const el = require('electron-log/main');
  if (typeof el.initialize === 'function') {
    try {
      el.initialize();
    } catch (_e) {
      // ignore initialization issues in non-Electron environments
    }
  }
  exportedLogger = el;
} catch (_e) {
  // Fallback console-based logger for non-Electron (CLI) contexts
  exportedLogger = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };
}

export default exportedLogger;
