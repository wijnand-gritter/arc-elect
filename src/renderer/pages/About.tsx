/**
 * About page component with application information.
 *
 * This component displays detailed information about the application,
 * including framework details, features, and technical specifications.
 * It uses a card layout with organized sections for better readability.
 *
 * @module About
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * About page component for application information.
 *
 * This component renders the about page with:
 * - Application information and framework details
 * - Key features and capabilities
 * - Technical specifications and badges
 * - Organized sections with separators
 *
 * @returns JSX element representing the about page
 *
 * @example
 * ```tsx
 * <About />
 * ```
 */
export function About(): React.JSX.Element {
  return (
    <div className="px-4 lg:px-6">
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
          <CardTitle className="text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-blue"></div>
            About
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Learn more about this Electron + React application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* App Information Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Application Information</h3>
              <p className="text-sm text-muted-foreground">
                Details about this Electron + Vite + React application
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Framework:</span>
                  <Badge variant="outline">Electron + React</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Build Tool:</span>
                  <Badge variant="outline">Vite</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Styling:</span>
                  <Badge variant="outline">Tailwind CSS</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">State Management:</span>
                  <Badge variant="outline">Zustand</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">UI Components:</span>
                  <Badge variant="outline">Radix UI</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Type Safety:</span>
                  <Badge variant="outline">TypeScript</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator className="border-primary/20" />

          {/* Features Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Key Features
              </h3>
              <p className="text-sm text-muted-foreground">What makes this application special</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Fast Startup</h4>
                    <p className="text-xs text-muted-foreground">
                      Optimized with lazy loading for quick application startup
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Modern UI</h4>
                    <p className="text-xs text-muted-foreground">
                      Beautiful interface with dark/light theme support
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Error Handling</h4>
                    <p className="text-xs text-muted-foreground">
                      Robust error handling with user-friendly notifications
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Performance Monitoring</h4>
                    <p className="text-xs text-muted-foreground">
                      Built-in performance tracking and optimization
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Cross Platform</h4>
                    <p className="text-xs text-muted-foreground">
                      Runs on Windows, macOS, and Linux
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="text-sm font-medium">Developer Friendly</h4>
                    <p className="text-xs text-muted-foreground">
                      Hot reload, DevTools, and modern development tools
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
