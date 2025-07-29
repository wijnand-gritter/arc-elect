/**
 * Memory management hook for performance optimization.
 *
 * This hook provides memory management functionality to track and optimize
 * memory usage, prevent memory leaks, and improve application performance.
 *
 * @module useMemoryManagement
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import logger from '../lib/renderer-logger';

/**
 * Memory usage information.
 */
interface MemoryUsage {
  /** Used JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total JS heap size in bytes */
  totalJSHeapSize: number;
  /** JS heap size limit in bytes */
  jsHeapSizeLimit: number;
  /** Memory usage percentage */
  usagePercentage: number;
  /** Human readable used heap size */
  usedReadable: string;
  /** Human readable total heap size */
  totalReadable: string;
  /** Human readable heap limit */
  limitReadable: string;
}

/**
 * Memory management options.
 */
interface MemoryManagementOptions {
  /** Enable memory monitoring */
  enableMonitoring?: boolean;
  /** Memory check interval in milliseconds */
  checkInterval?: number;
  /** Memory warning threshold percentage (0-100) */
  warningThreshold?: number;
  /** Memory critical threshold percentage (0-100) */
  criticalThreshold?: number;
  /** Enable automatic garbage collection suggestions */
  enableGC?: boolean;
  /** Enable memory usage logging */
  enableLogging?: boolean;
  /** Cache size limit for stored objects */
  cacheLimit?: number;
  /** Enable cache cleanup on memory pressure */
  enableCacheCleanup?: boolean;
}

/**
 * Memory management result.
 */
interface MemoryManagementResult {
  /** Current memory usage information */
  memoryUsage: MemoryUsage | null;
  /** Whether memory usage is being monitored */
  isMonitoring: boolean;
  /** Current memory status */
  memoryStatus: 'normal' | 'warning' | 'critical';
  /** Memory usage history (last N measurements) */
  usageHistory: MemoryUsage[];
  /** Memory cache for objects */
  cache: Map<string, any>;
  /** Function to start memory monitoring */
  startMonitoring: () => void;
  /** Function to stop memory monitoring */
  stopMonitoring: () => void;
  /** Function to force garbage collection (if available) */
  forceGC: () => void;
  /** Function to clear memory cache */
  clearCache: () => void;
  /** Function to set cache item */
  setCacheItem: (key: string, value: any, ttl?: number) => void;
  /** Function to get cache item */
  getCacheItem: (key: string) => any;
  /** Function to remove cache item */
  removeCacheItem: (key: string) => void;
  /** Function to get memory pressure level */
  getMemoryPressure: () => 'low' | 'moderate' | 'high';
  /** Memory optimization suggestions */
  optimizationSuggestions: string[];
}

/**
 * Cache item with TTL support.
 */
interface CacheItem {
  value: any;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Convert bytes to human readable format.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get current memory usage.
 */
function getMemoryUsage(): MemoryUsage | null {
  if (!('memory' in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage,
    usedReadable: formatBytes(memory.usedJSHeapSize),
    totalReadable: formatBytes(memory.totalJSHeapSize),
    limitReadable: formatBytes(memory.jsHeapSizeLimit),
  };
}

/**
 * Hook for memory management functionality.
 *
 * Provides memory monitoring, caching, and optimization utilities
 * to improve application performance and prevent memory issues.
 *
 * @param options - Memory management configuration
 * @returns Memory management utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   memoryUsage,
 *   memoryStatus,
 *   startMonitoring,
 *   setCacheItem,
 *   getCacheItem,
 *   clearCache
 * } = useMemoryManagement({
 *   enableMonitoring: true,
 *   warningThreshold: 70,
 *   criticalThreshold: 90,
 *   cacheLimit: 100
 * });
 * ```
 */
export function useMemoryManagement(
  options: MemoryManagementOptions = {},
): MemoryManagementResult {
  const {
    enableMonitoring = true,
    checkInterval = 5000,
    warningThreshold = 70,
    criticalThreshold = 90,
    enableGC = true,
    enableLogging = true,
    cacheLimit = 100,
    enableCacheCleanup = true,
  } = options;

  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [usageHistory, setUsageHistory] = useState<MemoryUsage[]>([]);
  const [cache, setCache] = useState<Map<string, CacheItem>>(new Map());

  const intervalRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(Date.now());

  /**
   * Calculate current memory status.
   */
  const memoryStatus = useMemo((): 'normal' | 'warning' | 'critical' => {
    if (!memoryUsage) return 'normal';
    
    if (memoryUsage.usagePercentage >= criticalThreshold) {
      return 'critical';
    } else if (memoryUsage.usagePercentage >= warningThreshold) {
      return 'warning';
    }
    
    return 'normal';
  }, [memoryUsage, warningThreshold, criticalThreshold]);

  /**
   * Get memory pressure level.
   */
  const getMemoryPressure = useCallback((): 'low' | 'moderate' | 'high' => {
    if (!memoryUsage) return 'low';
    
    if (memoryUsage.usagePercentage >= criticalThreshold) {
      return 'high';
    } else if (memoryUsage.usagePercentage >= warningThreshold) {
      return 'moderate';
    }
    
    return 'low';
  }, [memoryUsage, warningThreshold, criticalThreshold]);

  /**
   * Generate optimization suggestions.
   */
  const optimizationSuggestions = useMemo((): string[] => {
    const suggestions: string[] = [];
    
    if (!memoryUsage) return suggestions;
    
    if (memoryUsage.usagePercentage >= criticalThreshold) {
      suggestions.push('Memory usage is critical - consider closing unused tabs or applications');
      suggestions.push('Clear cache and temporary data');
      suggestions.push('Reduce the number of simultaneously loaded schemas');
    } else if (memoryUsage.usagePercentage >= warningThreshold) {
      suggestions.push('Memory usage is high - consider optimizing data usage');
      suggestions.push('Enable lazy loading for large datasets');
    }
    
    if (cache.size >= cacheLimit) {
      suggestions.push('Cache is full - oldest items will be automatically removed');
    }
    
    return suggestions;
  }, [memoryUsage, criticalThreshold, warningThreshold, cache.size, cacheLimit]);

  /**
   * Update memory usage.
   */
  const updateMemoryUsage = useCallback(() => {
    const usage = getMemoryUsage();
    if (usage) {
      setMemoryUsage(usage);
      
      // Update history (keep last 20 measurements)
      setUsageHistory(prev => {
        const newHistory = [...prev, usage];
        return newHistory.slice(-20);
      });

      // Log memory usage if enabled
      if (enableLogging && memoryStatus !== 'normal') {
        logger.warn('Memory usage', {
          used: usage.usedReadable,
          total: usage.totalReadable,
          percentage: usage.usagePercentage.toFixed(1),
          status: memoryStatus,
        });
      }
    }
  }, [enableLogging, memoryStatus]);

  /**
   * Start memory monitoring.
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring || !enableMonitoring) return;
    
    setIsMonitoring(true);
    updateMemoryUsage();
    
    intervalRef.current = setInterval(updateMemoryUsage, checkInterval);
    
    if (enableLogging) {
      logger.info('Memory monitoring started', { checkInterval });
    }
  }, [isMonitoring, enableMonitoring, updateMemoryUsage, checkInterval, enableLogging]);

  /**
   * Stop memory monitoring.
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    
    if (enableLogging) {
      logger.info('Memory monitoring stopped');
    }
  }, [isMonitoring, enableLogging]);

  /**
   * Force garbage collection (if available).
   */
  const forceGC = useCallback(() => {
    if (enableGC && 'gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        if (enableLogging) {
          logger.info('Forced garbage collection');
        }
      } catch (error) {
        logger.error('Failed to force garbage collection', error);
      }
    }
  }, [enableGC, enableLogging]);

  /**
   * Clean up expired cache items.
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    let removedCount = 0;
    
    setCache(prev => {
      const newCache = new Map(prev);
      
      // Remove expired items
      for (const [key, item] of newCache.entries()) {
        if (item.ttl && (now - item.timestamp) > item.ttl) {
          newCache.delete(key);
          removedCount++;
        }
      }
      
      // Remove oldest items if over limit (LRU)
      if (newCache.size > cacheLimit) {
        const sorted = Array.from(newCache.entries())
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        
        const toRemove = sorted.slice(0, newCache.size - cacheLimit);
        toRemove.forEach(([key]) => {
          newCache.delete(key);
          removedCount++;
        });
      }
      
      return newCache;
    });
    
    if (removedCount > 0 && enableLogging) {
      logger.info('Cache cleanup completed', { removedItems: removedCount });
    }
    
    lastCleanupRef.current = now;
  }, [cacheLimit, enableLogging]);

  /**
   * Set cache item with optional TTL.
   */
  const setCacheItem = useCallback((key: string, value: any, ttl?: number) => {
    const now = Date.now();
    const item: CacheItem = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    };
    
    setCache(prev => new Map(prev.set(key, item)));
    
    // Cleanup if needed
    if (now - lastCleanupRef.current > 60000) { // Cleanup every minute
      cleanupCache();
    }
  }, [cleanupCache]);

  /**
   * Get cache item.
   */
  const getCacheItem = useCallback((key: string): any => {
    const item = cache.get(key);
    if (!item) return undefined;
    
    // Check if expired
    if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      return undefined;
    }
    
    // Update access stats
    setCache(prev => {
      const newCache = new Map(prev);
      const updatedItem = {
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessed: Date.now(),
      };
      newCache.set(key, updatedItem);
      return newCache;
    });
    
    return item.value;
  }, [cache]);

  /**
   * Remove cache item.
   */
  const removeCacheItem = useCallback((key: string) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  /**
   * Clear all cache.
   */
  const clearCache = useCallback(() => {
    setCache(new Map());
    
    if (enableLogging) {
      logger.info('Memory cache cleared');
    }
  }, [enableLogging]);

  /**
   * Auto-cleanup cache on memory pressure.
   */
  useEffect(() => {
    if (enableCacheCleanup && memoryStatus === 'critical') {
      cleanupCache();
      
      // Force GC if available
      if (enableGC) {
        forceGC();
      }
    }
  }, [memoryStatus, enableCacheCleanup, cleanupCache, enableGC, forceGC]);

  /**
   * Start monitoring on mount if enabled.
   */
  useEffect(() => {
    if (enableMonitoring) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [enableMonitoring, startMonitoring, stopMonitoring]);

  /**
   * Cleanup cache periodically.
   */
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupCache, 300000); // Every 5 minutes
    return () => clearInterval(cleanupInterval);
  }, [cleanupCache]);

  return {
    memoryUsage,
    isMonitoring,
    memoryStatus,
    usageHistory,
    cache,
    startMonitoring,
    stopMonitoring,
    forceGC,
    clearCache,
    setCacheItem,
    getCacheItem,
    removeCacheItem,
    getMemoryPressure,
    optimizationSuggestions,
  };
}
