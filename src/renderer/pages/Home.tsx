/**
 * Home page component with dashboard layout.
 *
 * This component renders the home page of the application with
 * a welcome message and basic dashboard content. It includes
 * a test button for error handling demonstration.
 *
 * @module Home
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { safeHandler } from '@/lib/error-handling';

/**
 * Home page component for the application dashboard.
 *
 * This component renders the main dashboard page with:
 * - Welcome message and description
 * - Test button for error handling
 * - Consistent card layout and styling
 *
 * @returns JSX element representing the home page
 *
 * @example
 * ```tsx
 * <Home />
 * ```
 */
export function Home(): React.JSX.Element {
  return (
    <div className="px-4 lg:px-6">
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
          <CardTitle className="text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-blue"></div>
            Home Page
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Welcome to your Electron + Vite + React app!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is your application's home page. You can customize this content to match your
              app's purpose.
            </p>
            <Button
              variant="outline"
              onClick={safeHandler(() => {
                throw new Error('Testfout in event handler');
              })}
              className="border-gradient hover-lift hover:gradient-accent transition-all duration-200"
            >
              Test Error Handling
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
