/**
 * Project error component for JSON Schema Editor.
 *
 * This component displays error states when project loading fails.
 *
 * @module ProjectError
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Project error component props.
 */
interface ProjectErrorProps {
  /** Error message to display */
  error: string;
}

/**
 * Project error component.
 *
 * This component displays:
 * - Error message
 * - Retry functionality
 * - Clear error option
 *
 * @param props - Component props
 * @returns JSX element representing the error state
 *
 * @example
 * ```tsx
 * <ProjectError error="Failed to load project" />
 * ```
 */
export function ProjectError({ error }: ProjectErrorProps): React.JSX.Element {
  const clearProjectError = useAppStore((state) => state.clearProjectError);

  /**
   * Handles clearing the error and returning to setup.
   */
  const handleClearError = () => {
    clearProjectError();
  };

  return (
    <div className="px-4 lg:px-6">
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Project Error
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Something went wrong while loading your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <AlertTriangle className="w-12 h-12 text-destructive opacity-50" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please check the project path and try again.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClearError}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
