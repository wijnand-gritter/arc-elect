import React, { useEffect, Suspense } from 'react';
import logger from './lib/renderer-logger';
import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import './lib/error-handling';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useAppStore } from './stores/useAppStore';

import { AppLayout } from './components/AppLayout';

// Lazy load heavy providers
const QueryProviderLazy = React.lazy(() =>
  import('./components/QueryProvider').then((module) => ({ default: module.QueryProvider })),
);

export function App() {
  // Load theme from electron-store on app start
  useEffect(() => {
    const startTime = Date.now();
    logger.info('App component mounted - START');

    useAppStore
      .getState()
      .loadTheme()
      .then(() => {
        logger.info(`Theme loaded in ${Date.now() - startTime}ms`);
      });
  }, []);

  useEffect(() => {
    logger.info('Renderer log: React App component is geladen');
  }, []);

  useEffect(() => {
    function handleGlobalError(e: Event) {
      const detail = (e as CustomEvent).detail;
      toast.error(detail.title, {
        description: detail.description,
      });
    }
    window.addEventListener('global-error', handleGlobalError);
    return () => window.removeEventListener('global-error', handleGlobalError);
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <QueryProviderLazy>
          <ThemeProvider>
            <AppLayout />
            <Toaster />
          </ThemeProvider>
        </QueryProviderLazy>
      </Suspense>
    </ErrorBoundary>
  );
}
