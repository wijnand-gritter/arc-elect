/**
 * Singleton QueryClient instance for react-query (TanStack Query).
 *
 * This module provides a centralized QueryClient instance that can be
 * used throughout the application for data fetching and caching.
 * The QueryClient is configured with default settings optimized for
 * Electron applications.
 *
 * @module queryClient
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the application.
 *
 * This QueryClient is configured with default settings suitable for
 * Electron applications. It provides:
 * - Default query retry behavior
 * - Cache management
 * - Background refetching
 * - Optimistic updates
 *
 * @example
 * ```tsx
 * import { queryClient } from './lib/queryClient';
 *
 * // Use in QueryProvider
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * ```
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
