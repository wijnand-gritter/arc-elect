---
trigger: always_on
description:
globs:
---

# Error Handling Rules

## Logging Standards

### Logger Usage

- Always use the central logger (`main-logger.ts` or `renderer-logger.ts`)
- Use appropriate log levels (debug, info, warn, error)
- Include context and relevant data in log messages
- Use structured logging for better debugging

```typescript
// ✅ Good: Proper logging with context
import logger from './lib/renderer-logger';

logger.info('User logged in', { userId, timestamp });
logger.error('Failed to fetch data', { error: error.message, url, userId });

// ❌ Bad: Console logging or poor context
console.log('User logged in');
console.error('Error:', error);
```

### Log Levels

- **debug**: Development-only information
- **info**: General application events
- **warn**: Potential issues that don't break functionality
- **error**: Actual errors that need attention

## Error Handling Patterns

### Try-Catch Blocks

- Use try-catch for all async operations
- Handle specific error types when possible
- Provide meaningful error messages
- Log errors with context

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await apiCall();
  logger.info('API call successful', { result });
  return result;
} catch (error) {
  logger.error('API call failed', {
    error: error.message,
    stack: error.stack,
    context: 'user-action',
  });
  throw new Error('Failed to complete operation');
}

// ❌ Bad: No error handling or poor logging
const result = await apiCall();
return result;
```

### Error Boundaries

- Use ErrorBoundary for React component errors
- Provide fallback UI for component failures
- Log component errors with context
- Show user-friendly error messages

```typescript
// ✅ Good: Error boundary with proper handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Component error caught', {
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

## Safe Handler Pattern

### Event Handler Safety

- Use safeHandler utility for event handlers
- Catch, log, and show user feedback for errors
- Prevent unhandled promise rejections
- Provide retry mechanisms when appropriate

```typescript
// ✅ Good: Safe event handler
import { safeHandler } from './lib/error-handling';

const handleClick = safeHandler(async () => {
  const result = await riskyOperation();
  toast.success('Operation completed successfully');
  return result;
});

// ❌ Bad: Unsafe event handler
const handleClick = async () => {
  const result = await riskyOperation(); // May throw unhandled error
  toast.success('Operation completed successfully');
};
```

## IPC Error Handling

### Main Process IPC

- Validate all IPC data before processing
- Return structured error responses
- Log all IPC errors with context
- Handle IPC timeouts and failures

```typescript
// ✅ Good: IPC error handling
ipcMain.handle('api:action', async (event, data) => {
  try {
    // Validate input
    if (!isValidData(data)) {
      logger.warn('Invalid IPC data received', { data });
      return { success: false, error: 'Invalid data format' };
    }

    // Process data
    const result = await processData(data);
    logger.info('IPC action completed', {
      action: 'api:action',
      success: true,
    });

    return { success: true, result };
  } catch (error) {
    logger.error('IPC action failed', {
      action: 'api:action',
      error: error.message,
      data,
    });
    return { success: false, error: 'Operation failed' };
  }
});
```

### Renderer Process IPC

- Handle IPC errors gracefully
- Show user feedback for failures
- Implement retry logic when appropriate
- Log IPC communication issues

## Global Error Handling

### Main Process Errors

- Handle uncaught exceptions
- Handle unhandled promise rejections
- Log errors before process exit
- Implement graceful shutdown

```typescript
// ✅ Good: Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  // Graceful shutdown
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason,
    promise,
  });
});
```

### Renderer Process Errors

- Handle window.onerror events
- Handle unhandled promise rejections
- Show user-friendly error messages
- Log errors for debugging

```typescript
// ✅ Good: Renderer error handling
window.addEventListener('error', (event) => {
  logger.error('Window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
  toast.error('An unexpected error occurred');
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
  });
  toast.error('An operation failed unexpectedly');
});
```

## User Feedback

### Error Messages

- Show user-friendly error messages
- Avoid exposing technical details to users
- Provide actionable error messages
- Use toast notifications for immediate feedback

### Loading States

- Show loading states for async operations
- Handle loading timeouts
- Provide progress indicators for long operations
- Cancel operations when appropriate

### Retry Mechanisms

- Implement retry logic for transient failures
- Show retry options to users
- Limit retry attempts
- Provide fallback options

## Error Recovery

### Graceful Degradation

- Provide fallback functionality
- Handle partial failures gracefully
- Maintain app stability during errors
- Implement circuit breakers for external services

### Data Recovery

- Implement data validation
- Provide data recovery mechanisms
- Handle corrupted state gracefully
- Implement proper cleanup on errors

## Monitoring and Debugging

### Error Tracking

- Log errors with sufficient context
- Include stack traces for debugging
- Track error frequency and patterns
- Monitor error rates in production

### Performance Impact

- Avoid expensive operations in error handlers
- Use async error logging when possible
- Implement error rate limiting
- Monitor error handling performance

# Error Handling Rules

## Logging Standards

### Logger Usage

- Always use the central logger (`main-logger.ts` or `renderer-logger.ts`)
- Use appropriate log levels (debug, info, warn, error)
- Include context and relevant data in log messages
- Use structured logging for better debugging

```typescript
// ✅ Good: Proper logging with context
import logger from './lib/renderer-logger';

logger.info('User logged in', { userId, timestamp });
logger.error('Failed to fetch data', { error: error.message, url, userId });

// ❌ Bad: Console logging or poor context
console.log('User logged in');
console.error('Error:', error);
```

### Log Levels

- **debug**: Development-only information
- **info**: General application events
- **warn**: Potential issues that don't break functionality
- **error**: Actual errors that need attention

## Error Handling Patterns

### Try-Catch Blocks

- Use try-catch for all async operations
- Handle specific error types when possible
- Provide meaningful error messages
- Log errors with context

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await apiCall();
  logger.info('API call successful', { result });
  return result;
} catch (error) {
  logger.error('API call failed', {
    error: error.message,
    stack: error.stack,
    context: 'user-action',
  });
  throw new Error('Failed to complete operation');
}

// ❌ Bad: No error handling or poor logging
const result = await apiCall();
return result;
```

### Error Boundaries

- Use ErrorBoundary for React component errors
- Provide fallback UI for component failures
- Log component errors with context
- Show user-friendly error messages

```typescript
// ✅ Good: Error boundary with proper handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Component error caught', {
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

## Safe Handler Pattern

### Event Handler Safety

- Use safeHandler utility for event handlers
- Catch, log, and show user feedback for errors
- Prevent unhandled promise rejections
- Provide retry mechanisms when appropriate

```typescript
// ✅ Good: Safe event handler
import { safeHandler } from './lib/error-handling';

const handleClick = safeHandler(async () => {
  const result = await riskyOperation();
  toast.success('Operation completed successfully');
  return result;
});

// ❌ Bad: Unsafe event handler
const handleClick = async () => {
  const result = await riskyOperation(); // May throw unhandled error
  toast.success('Operation completed successfully');
};
```

## IPC Error Handling

### Main Process IPC

- Validate all IPC data before processing
- Return structured error responses
- Log all IPC errors with context
- Handle IPC timeouts and failures

```typescript
// ✅ Good: IPC error handling
ipcMain.handle('api:action', async (event, data) => {
  try {
    // Validate input
    if (!isValidData(data)) {
      logger.warn('Invalid IPC data received', { data });
      return { success: false, error: 'Invalid data format' };
    }

    // Process data
    const result = await processData(data);
    logger.info('IPC action completed', {
      action: 'api:action',
      success: true,
    });

    return { success: true, result };
  } catch (error) {
    logger.error('IPC action failed', {
      action: 'api:action',
      error: error.message,
      data,
    });
    return { success: false, error: 'Operation failed' };
  }
});
```

### Renderer Process IPC

- Handle IPC errors gracefully
- Show user feedback for failures
- Implement retry logic when appropriate
- Log IPC communication issues

## Global Error Handling

### Main Process Errors

- Handle uncaught exceptions
- Handle unhandled promise rejections
- Log errors before process exit
- Implement graceful shutdown

```typescript
// ✅ Good: Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  // Graceful shutdown
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason,
    promise,
  });
});
```

### Renderer Process Errors

- Handle window.onerror events
- Handle unhandled promise rejections
- Show user-friendly error messages
- Log errors for debugging

```typescript
// ✅ Good: Renderer error handling
window.addEventListener('error', (event) => {
  logger.error('Window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
  toast.error('An unexpected error occurred');
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
  });
  toast.error('An operation failed unexpectedly');
});
```

## User Feedback

### Error Messages

- Show user-friendly error messages
- Avoid exposing technical details to users
- Provide actionable error messages
- Use toast notifications for immediate feedback

### Loading States

- Show loading states for async operations
- Handle loading timeouts
- Provide progress indicators for long operations
- Cancel operations when appropriate

### Retry Mechanisms

- Implement retry logic for transient failures
- Show retry options to users
- Limit retry attempts
- Provide fallback options

## Error Recovery

### Graceful Degradation

- Provide fallback functionality
- Handle partial failures gracefully
- Maintain app stability during errors
- Implement circuit breakers for external services

### Data Recovery

- Implement data validation
- Provide data recovery mechanisms
- Handle corrupted state gracefully
- Implement proper cleanup on errors

## Monitoring and Debugging

### Error Tracking

- Log errors with sufficient context
- Include stack traces for debugging
- Track error frequency and patterns
- Monitor error rates in production

### Performance Impact

- Avoid expensive operations in error handlers
- Use async error logging when possible
- Implement error rate limiting
- Monitor error handling performance
