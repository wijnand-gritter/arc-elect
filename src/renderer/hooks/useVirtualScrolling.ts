/**
 * Virtual scrolling hook for performance optimization with large lists.
 *
 * This hook provides virtual scrolling functionality to efficiently render
 * large lists by only rendering visible items and a small buffer.
 *
 * @module useVirtualScrolling
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Virtual scrolling options.
 */
interface VirtualScrollOptions {
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Number of items to render outside visible area (buffer) */
  overscan?: number;
  /** Enable smooth scrolling behavior */
  smoothScrolling?: boolean;
}

/**
 * Virtual scrolling result.
 */
interface VirtualScrollResult<T> {
  /** Items currently visible in the viewport */
  visibleItems: Array<{ item: T; index: number }>;
  /** Total height needed for all items */
  totalHeight: number;
  /** Height offset for positioning visible items */
  offsetY: number;
  /** Current scroll position */
  scrollTop: number;
  /** Function to handle scroll events */
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  /** Function to scroll to specific item */
  scrollToItem: (index: number) => void;
  /** Ref for the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Range of currently visible items */
  visibleRange: { start: number; end: number };
}

/**
 * Hook for virtual scrolling functionality.
 *
 * Provides efficient rendering of large lists by virtualizing items
 * outside the visible viewport.
 *
 * @param items - Array of items to virtualize
 * @param options - Virtual scrolling configuration
 * @returns Virtual scrolling utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   visibleItems,
 *   totalHeight,
 *   offsetY,
 *   onScroll,
 *   containerRef
 * } = useVirtualScrolling(schemas, {
 *   itemHeight: 200,
 *   containerHeight: 600,
 *   overscan: 3
 * });
 * ```
 */
export function useVirtualScrolling<T>(
  items: T[],
  options: VirtualScrollOptions,
): VirtualScrollResult<T> {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    smoothScrolling = true,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Calculate visible range based on scroll position.
   */
  const visibleRange = useMemo(() => {
    const itemCount = items.length;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + visibleItemCount - 1
    );

    // Apply overscan buffer
    const bufferedStart = Math.max(0, startIndex - overscan);
    const bufferedEnd = Math.min(itemCount - 1, endIndex + overscan);

    return {
      start: bufferedStart,
      end: bufferedEnd,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  /**
   * Get visible items with their indices.
   */
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i]) {
        result.push({ item: items[i], index: i });
      }
    }
    return result;
  }, [items, visibleRange]);

  /**
   * Calculate total height needed for all items.
   */
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  /**
   * Calculate offset for positioning visible items.
   */
  const offsetY = useMemo(() => {
    return visibleRange.start * itemHeight;
  }, [visibleRange.start, itemHeight]);

  /**
   * Handle scroll events.
   */
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  /**
   * Scroll to specific item by index.
   */
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      if (smoothScrolling) {
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      } else {
        containerRef.current.scrollTop = scrollTop;
      }
    }
  }, [itemHeight, smoothScrolling]);

  /**
   * Update scroll position when container height changes.
   */
  useEffect(() => {
    if (containerRef.current) {
      const currentScrollTop = containerRef.current.scrollTop;
      setScrollTop(currentScrollTop);
    }
  }, [containerHeight]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    scrollTop,
    onScroll,
    scrollToItem,
    containerRef,
    visibleRange,
  };
}

/**
 * Hook for virtual grid scrolling (2D virtualization).
 * 
 * Provides efficient rendering of large grids by virtualizing both
 * rows and columns outside the visible viewport.
 */
interface VirtualGridOptions {
  /** Width of each item in pixels */
  itemWidth: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Width of the container in pixels */
  containerWidth: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Gap between items in pixels */
  gap?: number;
  /** Number of items to render outside visible area (buffer) */
  overscan?: number;
}

interface VirtualGridResult<T> {
  /** Items currently visible in the viewport */
  visibleItems: Array<{ item: T; index: number; row: number; col: number; x: number; y: number }>;
  /** Total height needed for all items */
  totalHeight: number;
  /** Current scroll position */
  scrollTop: number;
  /** Function to handle scroll events */
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  /** Function to scroll to specific item */
  scrollToItem: (index: number) => void;
  /** Ref for the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Number of columns in the grid */
  columnsPerRow: number;
}

/**
 * Hook for virtual grid scrolling functionality.
 *
 * @param items - Array of items to virtualize
 * @param options - Virtual grid configuration
 * @returns Virtual grid utilities and state
 */
export function useVirtualGrid<T>(
  items: T[],
  options: VirtualGridOptions,
): VirtualGridResult<T> {
  const {
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap = 16,
    overscan = 3,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Calculate number of columns that fit in container width.
   */
  const columnsPerRow = useMemo(() => {
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap]);

  /**
   * Calculate visible range based on scroll position.
   */
  const visibleRange = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnsPerRow);
    const visibleRowCount = Math.ceil(containerHeight / (itemHeight + gap));
    
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.min(totalRows - 1, startRow + visibleRowCount - 1);

    // Apply overscan buffer
    const bufferedStartRow = Math.max(0, startRow - overscan);
    const bufferedEndRow = Math.min(totalRows - 1, endRow + overscan);

    return {
      startRow: bufferedStartRow,
      endRow: bufferedEndRow,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, columnsPerRow, gap, overscan]);

  /**
   * Get visible items with their positions.
   */
  const visibleItems = useMemo(() => {
    const result = [];
    
    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < items.length && items[index]) {
          const x = col * (itemWidth + gap);
          const y = row * (itemHeight + gap);
          
          result.push({
            item: items[index],
            index,
            row,
            col,
            x,
            y,
          });
        }
      }
    }
    
    return result;
  }, [items, visibleRange, columnsPerRow, itemWidth, itemHeight, gap]);

  /**
   * Calculate total height needed for all rows.
   */
  const totalHeight = useMemo(() => {
    const totalRows = Math.ceil(items.length / columnsPerRow);
    return totalRows * (itemHeight + gap) - gap;
  }, [items.length, columnsPerRow, itemHeight, gap]);

  /**
   * Handle scroll events.
   */
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  /**
   * Scroll to specific item by index.
   */
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const row = Math.floor(index / columnsPerRow);
      const scrollTop = row * (itemHeight + gap);
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }, [columnsPerRow, itemHeight, gap]);

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    onScroll,
    scrollToItem,
    containerRef,
    columnsPerRow,
  };
}
