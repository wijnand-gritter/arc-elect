/**
 * Project loading component for JSON Schema Editor.
 *
 * This component displays a loading state when a project is being loaded.
 *
 * @module ProjectLoading
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

/**
 * Project loading component.
 *
 * This component displays:
 * - Loading spinner
 * - Loading message
 * - Progress indication
 *
 * @returns JSX element representing the loading state
 *
 * @example
 * ```tsx
 * <ProjectLoading />
 * ```
 */
export function ProjectLoading(): React.JSX.Element {
  return (
    <div className="px-4 lg:px-6">
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading Project
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Please wait while we load your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Scanning project directory and loading schemas...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
