/**
 * Footer component for the application.
 *
 * This component provides the footer section of the application with
 * copyright information, version details, and additional links.
 * It uses consistent styling with the rest of the application.
 *
 * @module Footer
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';

/**
 * Footer component for the application layout.
 *
 * This component renders the footer section with:
 * - Copyright information
 * - Application version
 * - Author information
 * - Consistent styling with the app theme
 *
 * @returns JSX element representing the footer
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */
export const Footer: React.FC = () => {
  const appName = import.meta.env.VITE_APP_NAME || 'App';
  const appVersion = import.meta.env.VITE_APP_VERSION || '';
  const appAuthor = import.meta.env.VITE_APP_AUTHOR || '';

  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>© 2024 {appName}</span>
            {appVersion && <span>v{appVersion}</span>}
          </div>
          <div className="flex items-center gap-4">{appAuthor && <span>by {appAuthor}</span>}</div>
        </div>
      </div>
    </footer>
  );
};
