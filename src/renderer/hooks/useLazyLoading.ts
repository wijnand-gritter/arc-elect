/**
 * Lazy loading hook for performance optimization with large datasets.
 *
 * This hook provides lazy loading functionality to efficiently load
 * data in chunks as needed, reducing initial load time and memory usage.
 *
 * @module useLazyLoading
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Lazy loading options.
 */
interface LazyLoadingOptions<T> {
  /** Initial number of items to load */
  initialCount?: number;
  /** Number of items to load per batch */
  batchSize?: number;
  /** Function to load data batches */
  loadBatch?: (startIndex: number, count: number) => Promise<T[]>;
  /** Function to filter items */
  filterFn?: (item: T) => boolean;
  /** Function to sort items */
  sortFn?: (a: T, b: T) => number;
  /** Preload threshold (load next batch when this many items from end) */
  preloadThreshold?: number;
  /** Enable automatic loading when scrolling near end */
  autoLoad?: boolean;
  /** Debounce delay for loading operations in ms */
  debounceDelay?: number;
}

/**
 * Lazy loading result.
 */
interface LazyLoadingResult<T> {
  /** Currently loaded items */
  items: T[];
  /** All available items (if loaded) */
  allItems: T[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether all data has been loaded */
  hasMore: boolean;
  /** Current error if any */
  error: string | null;
  /** Total number of items available */
  totalCount: number;
  /** Number of currently loaded items */
  loadedCount: number;
  /** Function to load more items */
  loadMore: () => Promise<void>;
  /** Function to reload all items */
  reload: () => Promise<void>;
  /** Function to reset to initial state */
  reset: () => void;
  /** Function to trigger load when scrolling */
  onScroll: (scrollTop: number, containerHeight: number, totalHeight: number) => void;
}

/**
 * Hook for lazy loading functionality.
 *
 * Provides efficient loading of large datasets by loading items in batches
 * as needed, with support for filtering, sorting, and automatic preloading.
 *
 * @param allData - Complete dataset to lazily load from
 * @param options - Lazy loading configuration
 * @returns Lazy loading utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   isLoading,
 *   hasMore,
 *   loadMore,
 *   onScroll
 * } = useLazyLoading(schemas, {
 *   initialCount: 20,
 *   batchSize: 10,
 *   preloadThreshold: 5
 * });
 * ```
 */
export function useLazyLoading<T>(
  allData: T[],
  options: LazyLoadingOptions<T> = {},
): LazyLoadingResult<T> {
  const {
    initialCount = 20,
    batchSize = 10,
    loadBatch,
    filterFn,
    sortFn,
    preloadThreshold = 5,
    autoLoad = true,
    debounceDelay = 100,
  } = options;

  const [loadedCount, setLoadedCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process all data with filtering and sorting.
   */
  const processedData = useMemo(() => {
    let processed = [...allData];
    
    // Apply filtering
    if (filterFn) {
      processed = processed.filter(filterFn);
    }
    
    // Apply sorting
    if (sortFn) {
      processed.sort(sortFn);
    }
    
    return processed;
  }, [allData, filterFn, sortFn]);

  /**
   * Get currently visible items.
   */
  const items = useMemo(() => {
    return processedData.slice(0, loadedCount);
  }, [processedData, loadedCount]);

  /**
   * Check if there are more items to load.
   */
  const hasMore = useMemo(() => {
    return loadedCount < processedData.length;
  }, [loadedCount, processedData.length]);

  /**
   * Load more items.
   */
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (loadBatch) {
        // Use custom batch loading function
        await loadBatch(loadedCount, batchSize);
        // This would require additional state management for external data
        // For now, we'll just use the internal data
      }
      
      // Load next batch from processed data
      const newCount = Math.min(
        loadedCount + batchSize,
        processedData.length
      );
      
      // Simulate async loading delay for UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setLoadedCount(newCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [loadedCount, batchSize, hasMore, loadBatch, processedData.length]);

  /**
   * Reload all items from the beginning.
   */
  const reload = useCallback(async () => {
    setLoadedCount(initialCount);
    setError(null);
    await loadMore();
  }, [initialCount, loadMore]);

  /**
   * Reset to initial state.
   */
  const reset = useCallback(() => {
    setLoadedCount(initialCount);
    setIsLoading(false);
    setError(null);
    loadingRef.current = false;
  }, [initialCount]);

  /**
   * Handle scroll events for automatic loading.
   */
  const onScroll = useCallback(
    (scrollTop: number, containerHeight: number, totalHeight: number) => {
      if (!autoLoad || !hasMore || loadingRef.current) {
        return;
      }

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce scroll handling
      debounceRef.current = setTimeout(() => {
        const scrollBottom = scrollTop + containerHeight;
        const threshold = totalHeight - (preloadThreshold * 200); // Assume 200px per item
        
        if (scrollBottom >= threshold) {
          loadMore();
        }
      }, debounceDelay);
    },
    [autoLoad, hasMore, preloadThreshold, debounceDelay, loadMore]
  );

  /**
   * Load initial data when allData changes.
   */
  useEffect(() => {
    if (allData.length > 0 && loadedCount > processedData.length) {
      setLoadedCount(Math.min(initialCount, processedData.length));
    }
  }, [allData.length, processedData.length, initialCount, loadedCount]);

  /**
   * Cleanup debounce timer.
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    items,
    allItems: processedData,
    isLoading,
    hasMore,
    error,
    totalCount: processedData.length,
    loadedCount,
    loadMore,
    reload,
    reset,
    onScroll,
  };
}

/**
 * Hook for infinite scrolling with intersection observer.
 * 
 * Uses intersection observer to detect when user scrolls near the end
 * and automatically loads more content.
 */
interface InfiniteScrollOptions<T> extends LazyLoadingOptions<T> {
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
}

interface InfiniteScrollResult<T> extends LazyLoadingResult<T> {
  /** Ref for the sentinel element that triggers loading */
  sentinelRef: React.RefObject<HTMLDivElement>;
  /** Whether the sentinel is currently visible */
  isIntersecting: boolean;
}

/**
 * Hook for infinite scrolling with intersection observer.
 *
 * @param allData - Complete dataset to lazily load from
 * @param options - Infinite scroll configuration
 * @returns Infinite scroll utilities and state
 */
export function useInfiniteScroll<T>(
  allData: T[],
  options: InfiniteScrollOptions<T> = {},
): InfiniteScrollResult<T> {
  const {
    rootMargin = '100px',
    threshold = 0.1,
    ...lazyOptions
  } = options;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const lazyResult = useLazyLoading(allData, lazyOptions);

  /**
   * Set up intersection observer for automatic loading.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting && lazyResult.hasMore && !lazyResult.isLoading) {
          lazyResult.loadMore();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [rootMargin, threshold, lazyResult.hasMore, lazyResult.isLoading, lazyResult.loadMore]);

  return {
    ...lazyResult,
    sentinelRef,
    isIntersecting,
  };
}
