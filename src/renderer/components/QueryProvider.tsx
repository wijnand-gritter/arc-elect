/**
 * QueryProvider for react-query (TanStack Query).
 *
 * This component provides the QueryClient context to the application,
 * enabling data fetching and caching capabilities throughout the app.
 * It wraps the application with the necessary providers for react-query.
 *
 * @module QueryProvider
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

/**
 * Props interface for the QueryProvider component.
 */
interface QueryProviderProps {
  /** Child components to be wrapped by the provider */
  children: React.ReactNode;
}

/**
 * QueryProvider component for react-query integration.
 *
 * This component wraps the application with the QueryClientProvider,
 * enabling data fetching and caching capabilities. It uses the
 * singleton queryClient instance for consistent behavior.
 *
 * @param props - Component props
 * @param props.children - Child components to wrap
 * @returns JSX element providing query context
 *
 * @example
 * ```tsx
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 * ```
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Optionally add React Query Devtools here in development */}
    </QueryClientProvider>
  );
};
