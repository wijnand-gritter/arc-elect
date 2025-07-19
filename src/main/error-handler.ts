// File-level comment: Global error handling for main process, catching uncaughtException and unhandledRejection.

import logger from './main-logger';

// Handle uncaught exceptions
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

// Handle unhandled promise rejections
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
