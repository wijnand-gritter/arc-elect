import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useErrorHandling } from '../useErrorHandling';

// Mock toast
const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock logger
const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

vi.mock('@renderer/lib/renderer-logger', () => ({
  default: mockLogger,
}));

describe('useErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle errors with proper categorization', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const testError = new Error('Network error');
    
    act(() => {
      result.current.handleError(testError, {
        context: 'API call',
        severity: 'high',
      });
    });
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in API call:',
      {
        message: 'Network error',
        stack: testError.stack,
        severity: 'high',
      }
    );
    
    expect(mockToast.error).toHaveBeenCalledWith(
      'An error occurred during API call',
      {
        description: 'Network error',
        action: expect.any(Object),
      }
    );
  });

  it('should create safe handlers that catch errors', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const riskyFunction = vi.fn().mockRejectedValue(new Error('Async error'));
    const safeHandler = result.current.createSafeHandler(riskyFunction, {
      context: 'Button click',
    });
    
    await act(async () => {
      await safeHandler();
    });
    
    expect(riskyFunction).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('should provide retry functionality', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const failingFunction = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce('Success');
    
    let retryResult;
    
    await act(async () => {
      retryResult = await result.current.withRetry(
        failingFunction,
        {
          maxAttempts: 2,
          delay: 100,
          backoff: 'linear',
        }
      );
    });
    
    expect(failingFunction).toHaveBeenCalledTimes(2);
    expect(retryResult).toBe('Success');
  });

  it('should implement exponential backoff', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const failingFunction = vi.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValueOnce('Success');
    
    const startTime = Date.now();
    
    await act(async () => {
      await result.current.withRetry(
        failingFunction,
        {
          maxAttempts: 3,
          delay: 50,
          backoff: 'exponential',
        }
      );
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should have waited with exponential backoff (50ms + 100ms)
    expect(totalTime).toBeGreaterThan(140); // 50 + 100 + some execution time
    expect(failingFunction).toHaveBeenCalledTimes(3);
  });

  it('should categorize errors by type', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    // Network error
    const networkError = new Error('Failed to fetch');
    
    act(() => {
      result.current.handleError(networkError);
    });
    
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('network'),
      expect.any(Object)
    );
    
    vi.clearAllMocks();
    
    // Validation error
    const validationError = new Error('Invalid JSON format');
    
    act(() => {
      result.current.handleError(validationError);
    });
    
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('validation'),
      expect.any(Object)
    );
  });

  it('should provide recovery suggestions', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const suggestions = result.current.getRecoverySuggestions('network');
    
    expect(suggestions).toContain('Check your internet connection');
    expect(suggestions).toContain('Try refreshing the page');
  });

  it('should handle different severity levels', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const lowSeverityError = new Error('Minor issue');
    
    act(() => {
      result.current.handleError(lowSeverityError, {
        severity: 'low',
        context: 'Background task',
      });
    });
    
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('should track error history', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    
    act(() => {
      result.current.handleError(error1);
      result.current.handleError(error2);
    });
    
    const history = result.current.getErrorHistory();
    
    expect(history).toHaveLength(2);
    expect(history[0].message).toBe('First error');
    expect(history[1].message).toBe('Second error');
  });

  it('should clear error history', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    act(() => {
      result.current.handleError(new Error('Test error'));
    });
    
    expect(result.current.getErrorHistory()).toHaveLength(1);
    
    act(() => {
      result.current.clearErrorHistory();
    });
    
    expect(result.current.getErrorHistory()).toHaveLength(0);
  });

  it('should handle custom error types', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    class CustomError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    
    const customError = new CustomError('Custom error message', 'CUSTOM_001');
    
    act(() => {
      result.current.handleError(customError, {
        context: 'Custom operation',
      });
    });
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in Custom operation:',
      expect.objectContaining({
        message: 'Custom error message',
        code: 'CUSTOM_001',
      })
    );
  });
});
