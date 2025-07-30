/**
 * Page content component for dynamic page rendering.
 *
 * This component renders different pages based on the current app state,
 * providing instant navigation without routing overhead. It uses
 * conditional rendering to show the appropriate page component.
 *
 * @module PageContent
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Settings } from '@/pages/Settings';
import { Project } from '@/pages/Project';
import { Explore } from '@/pages/Explore';
import { Build } from '@/pages/Build';
import { Analytics } from '@/pages/Analytics';

/**
 * PageContent component for dynamic page rendering.
 *
 * This component renders the appropriate page based on the current
 * application state. It provides instant page switching without
 * the overhead of a routing library.
 *
 * @returns JSX element representing the current page content
 *
 * @example
 * ```tsx
 * <PageContent />
 * ```
 */
export function PageContent(): React.JSX.Element {
  const currentPage = useAppStore((state) => state.currentPage);
  const isLoadingProject = useAppStore((state) => state.isLoadingProject);
  const currentProject = useAppStore((state) => state.currentProject);

  // Show loading state when project is being loaded
  if (isLoadingProject) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="container mx-auto flex flex-1 flex-col gap-4 p-6 max-w-7xl">
          <div className="page-transition flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Loading project...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show project setup if no project is loaded and we're not on settings
  if (!currentProject && currentPage !== 'settings') {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="container mx-auto flex flex-1 flex-col gap-4 p-6 max-w-7xl">
          <div className="page-transition flex-1">
            <Project />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="container mx-auto flex flex-1 flex-col gap-4 p-6 max-w-7xl">
        <div className="page-transition flex-1">
          {currentPage === 'project' && (
            <ErrorBoundary>
              <Project />
            </ErrorBoundary>
          )}
          {currentPage === 'explore' && (
            <ErrorBoundary>
              <Explore />
            </ErrorBoundary>
          )}
          {currentPage === 'build' && (
            <ErrorBoundary>
              <Build />
            </ErrorBoundary>
          )}
          {currentPage === 'analytics' && (
            <ErrorBoundary>
              <Analytics />
            </ErrorBoundary>
          )}
          {currentPage === 'settings' && (
            <ErrorBoundary>
              <Settings />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
