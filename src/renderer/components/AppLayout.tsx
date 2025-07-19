/**
 * AppLayout component with TopNavigationBar navigation.
 *
 * This component provides the main layout structure for the application,
 * including the navigation bar, main content area, and footer. It uses
 * a floating card design with glassmorphism effects and proper spacing.
 *
 * @module AppLayout
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';

import { TopNavigationBar } from './TopNavigationBar';
import { Footer } from './Footer';
import { PageContent } from './PageContent';

/**
 * AppLayout component for the main application structure.
 *
 * This component renders the complete application layout with:
 * - TopNavigationBar for navigation
 * - PageContent for dynamic page rendering
 * - Footer for additional information
 * - Glassmorphism background and styling
 *
 * @returns JSX element representing the complete app layout
 *
 * @example
 * ```tsx
 * <AppLayout />
 * ```
 */
export const AppLayout: React.FC = () => {
  return (
    <div className="app-background min-h-screen flex flex-col p-4">
      <div className="flex flex-col flex-1 bg-background/95 backdrop-blur-sm rounded-lg shadow-2xl border border-border/20 overflow-hidden">
        <TopNavigationBar />
        <main className="flex-1 flex flex-col">
          <PageContent />
        </main>
        <Footer />
      </div>
    </div>
  );
};
