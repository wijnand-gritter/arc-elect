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
import { useAppStore } from '@/stores/useAppStore';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Settings } from '@/pages/Settings';

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

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="container mx-auto flex flex-1 flex-col gap-4 p-6 max-w-7xl">
        <div className="page-transition flex-1">
          {currentPage === 'home' && <Home />}
          {currentPage === 'about' && <About />}
          {currentPage === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}
