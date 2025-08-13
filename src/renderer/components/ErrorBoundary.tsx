/**
 * ErrorBoundary component for React error handling.
 *
 * This component catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree
 * that crashed. It also shows toast notifications for user feedback.
 *
 * @module ErrorBoundary
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import logger from '@/lib/renderer-logger';

/**
 * Props interface for the ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary */
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
}

/**
 * State interface for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error?: Error;
  /** Additional error information */
  errorInfo?: ErrorInfo;
}

/**
 * ErrorBoundary component for React error handling.
 *
 * This component provides error boundary functionality for React applications.
 * It catches JavaScript errors in child components and displays a fallback UI.
 *
 * Features:
 * - Catches JavaScript errors in component tree
 * - Logs errors for debugging
 * - Shows user-friendly error UI
 * - Provides error recovery options
 * - Displays toast notifications
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Static method to update state when an error occurs.
   *
   * This method is called when an error is thrown in a child component.
   * It updates the component state to indicate an error has occurred.
   *
   * @param error - The error that was thrown
   * @returns State update object
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called when an error occurs.
   *
   * This method is called after an error has been thrown in a child component.
   * It logs the error and shows a toast notification to the user.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Additional error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info in state for detailed display
    this.setState({ errorInfo });

    // Show toast notification
    toast.error('Component Error', {
      description: `${error.name}: ${error.message}`,
    });
  }

  /**
   * Handles the retry action when user clicks the retry button.
   *
   * This method resets the error state, allowing the component
   * to attempt rendering again.
   */
  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  /**
   * Renders the component.
   *
   * If an error has occurred, renders the fallback UI.
   * Otherwise, renders the child components normally.
   *
   * @returns JSX element representing the component
   */
  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with detailed error information
      const { error, errorInfo } = this.state;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-4xl glass-red border-0">
            <CardHeader className="gradient-destructive rounded-t-lg border-b border-destructive/20">
              <CardTitle className="text-destructive-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Component Error Occurred
              </CardTitle>
              <CardDescription className="text-destructive-foreground/80">
                {error?.name || 'Error'}:{' '}
                {error?.message || 'An unexpected error occurred'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                {/* Error Details */}
                {error && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Error Details:
                    </h4>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono">
                      <div>
                        <strong>Name:</strong> {error.name}
                      </div>
                      <div>
                        <strong>Message:</strong> {error.message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stack Trace */}
                {error?.stack && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Stack Trace:
                    </h4>
                    <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {error.stack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Component Stack:
                    </h4>
                    <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="destructive"
                  size="sm"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
