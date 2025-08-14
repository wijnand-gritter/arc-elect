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
import { Project } from '@/pages/Project';
import { Explore } from '@/pages/Explore';
import { Build } from '@/pages/Build';
import { Analytics } from '@/pages/Analytics';
import { Onboarding } from '@/pages/Onboarding';
import { NoProjectBanner } from '@/components/NoProjectBanner';

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
      <div className="h-full flex flex-col overflow-visible min-h-0">
        <div className="flex flex-1 items-center justify-center overflow-visible min-h-0">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding screen and top banner if no project is loaded
  if (!currentProject) {
    return (
      <div className="h-full flex flex-col overflow-visible min-h-0">
        <NoProjectBanner
          onOpenProject={() =>
            document.dispatchEvent(
              new CustomEvent('show-project-required-modal'),
            )
          }
          onCreateProject={() =>
            document.dispatchEvent(
              new CustomEvent('show-project-required-modal'),
            )
          }
        />
        <div className="flex flex-1 overflow-visible min-h-0">
          <div className="page-transition flex-1 overflow-visible min-h-0">
            <Onboarding />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-visible min-h-0">
      <div className="flex flex-1 overflow-visible min-h-0">
        <div className="page-transition flex-1 overflow-visible min-h-0">
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
        </div>
      </div>
    </div>
  );
}
