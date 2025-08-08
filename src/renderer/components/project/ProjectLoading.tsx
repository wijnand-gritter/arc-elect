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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
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
    <div className="h-full flex flex-col">
      <Card className="glass-blue border-0 flex-1">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20 py-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading Project
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Please wait while we load your project files
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
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
