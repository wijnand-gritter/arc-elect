/**
 * AppLayout component with TopNavigationBar navigation.
 *
 * This component provides the main layout structure for the application,
 * including the navigation bar, main content area, footer, keyboard shortcuts,
 * and accessibility features. It uses a floating card design with glassmorphism
 * effects and proper spacing.
 *
 * @module AppLayout
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState } from 'react';

import { TopNavigationBar } from './TopNavigationBar';
import { Footer } from './Footer';
import { PageContent } from './PageContent';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAccessibility } from '../hooks/useAccessibility';
import { useAppStore } from '../stores/useAppStore';

/**
 * AppLayout component for the main application structure.
 *
 * This component renders the complete application layout with:
 * - TopNavigationBar for navigation
 * - PageContent for dynamic page rendering
 * - Footer for additional information
 * - Keyboard shortcuts integration
 * - Accessibility enhancements
 * - Help modal for shortcuts
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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { setPage } = useAppStore();

  // Initialize accessibility features
  const { announce, addSkipLink } = useAccessibility({
    enableFocusManagement: true,
    enableScreenReaderSupport: true,
    enableKeyboardNavigation: true,
    enableFocusIndicators: true,
  });

  // Initialize keyboard shortcuts with custom handlers
  useKeyboardShortcuts({
    enableGlobal: true,
    customHandlers: {
      help: () => {
        setIsHelpModalOpen(true);
        announce('Keyboard shortcuts help opened');
      },
      'navigate-explore': () => {
        setPage('explore');
        announce('Switched to Explore page');
      },
      'navigate-build': () => {
        setPage('build');
        announce('Switched to Build page');
      },
      'navigate-analytics': () => {
        setPage('analytics');
        announce('Switched to Analytics page');
      },
      escape: () => {
        if (isHelpModalOpen) {
          setIsHelpModalOpen(false);
          announce('Help modal closed');
        }
      },
    },
  });

  // Add skip links for accessibility
  React.useEffect(() => {
    addSkipLink('main-content', 'Skip to main content');
    addSkipLink('navigation', 'Skip to navigation');
  }, [addSkipLink]);

  return (
    <div className="app-background min-h-screen flex flex-col p-3">
      {/* Main app container */}
      <div className="flex flex-col flex-1 bg-background/95 backdrop-blur-sm rounded-lg shadow-2xl border border-border/20 overflow-hidden">
        {/* Navigation */}
        <nav id="navigation" role="navigation" aria-label="Main navigation">
          <TopNavigationBar />
        </nav>

        {/* Main content area */}
        <main
          id="main-content"
          className="flex-1 flex flex-col"
          role="main"
          aria-label="Main content"
        >
          <PageContent />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal
        isOpen={isHelpModalOpen}
        onClose={() => {
          setIsHelpModalOpen(false);
          announce('Help modal closed');
        }}
      />
    </div>
  );
};
