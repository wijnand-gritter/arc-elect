/**
 * Analytics page component for JSON Schema Editor.
 *
 * This component provides comprehensive project-wide schema analytics and insights
 * including validation statistics, complexity metrics, circular reference detection,
 * and reference graph visualization.
 *
 * @module Analytics
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { BarChart3, RefreshCw, HelpCircle, AlertTriangle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useAppStore } from '../stores/useAppStore';
import { analyticsService, type AnalyticsResult } from '../services/analytics';
import logger from '../lib/renderer-logger';
import { safeHandler } from '../lib/error-handling';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

/**
 * Analytics page component for comprehensive schema insights.
 *
 * This component provides:
 * - Validation statistics with charts
 * - Complexity metrics and trends
 * - Circular reference detection and visualization
 * - Reference graph analysis
 * - Performance insights
 * - Project health indicators
 *
 * @returns JSX element representing the analytics page
 */
export function Analytics(): React.JSX.Element {
  const currentProject = useAppStore((state) => state.currentProject);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false); // legacy flag, no longer gates UI
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Analyze schemas when project changes
  useEffect(() => {
    if (currentProject?.schemas && currentProject.schemas.length > 0) {
      void analyzeSchemas(false);
    } else {
      setAnalytics(null);
    }
  }, [currentProject?.schemas]);

  const analyzeSchemas = safeHandler(async (showToast: boolean = true) => {
    if (!currentProject?.schemas) return;
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Starting schema analysis', {
        projectName: currentProject.name,
        schemaCount: currentProject.schemas.length,
        isManualRefresh: showToast,
      });
      const result = await analyticsService.analyzeSchemas(
        currentProject.schemas,
      );
      setAnalytics(result);

      logger.info('Schema analysis completed', {
        duration: result.performance.duration,
        circularReferences: result.circularReferences.length,
        totalSchemas: result.projectMetrics.totalSchemas,
        isManualRefresh: showToast,
      });

      // Success toast intentionally suppressed (errors only)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Schema analysis failed', { error: errorMessage });

      // Always show error toasts
      toast.error('Analytics failed', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  });

  // Wrapper function for manual refresh button
  const handleManualRefresh = useCallback(
    safeHandler(() => {
      analyzeSchemas(true);
    }),
    [analyzeSchemas],
  );

  // No project loaded state
  if (!currentProject) {
    return (
      <div className="h-full flex flex-col">
        <Card className="glass-blue border-0 flex-1">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">No Project Loaded</h3>
                  <p className="text-sm text-muted-foreground">
                    Load a project to view comprehensive analytics
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schemas = currentProject.schemas || [];
  const totalSchemas = schemas.length;

  // Search insights (suggestions)
  const [sugSearch, setSugSearch] = useState('');
  const [debouncedSugSearch, setDebouncedSugSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSugSearch(sugSearch), 300);
    return () => clearTimeout(t);
  }, [sugSearch]);

  const filteredSuggestions = useMemo(() => {
    if (!analytics) return [] as AnalyticsResult['suggestions'];
    const q = debouncedSugSearch.trim().toLowerCase();
    if (!q) return analytics.suggestions;
    return analytics.suggestions.filter((s) => {
      if (s.title.toLowerCase().includes(q)) return true;
      if (s.description.toLowerCase().includes(q)) return true;
      if (s.category.toLowerCase().includes(q)) return true;
      if (s.severity.toLowerCase().includes(q)) return true;
      if (s.affectedSchemas.some((n) => n.toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [analytics, debouncedSugSearch]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-medium">Analyzing Schemas</h3>
                <p className="text-sm text-muted-foreground">
                  This may take a moment for large projects...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview removed for simplified view */}

      {/* Main Analytics Content */}
      {!isLoading && analytics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Actionable Insights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Prioritized suggestions with severity and clear next steps
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-64"
                  placeholder="Search insights…"
                  aria-label="Search insights"
                  value={sugSearch}
                  onChange={(e) => setSugSearch(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsHelpOpen(true)}
                  title="About Insights"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredSuggestions.length === 0 && (
                  <div className="text-sm text-muted-foreground py-4">
                    No matching insights
                  </div>
                )}
                {filteredSuggestions.map((sug) => (
                  <div key={sug.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{sug.category}</Badge>
                        <span className="font-medium">{sug.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            sug.severity === 'high'
                              ? 'destructive'
                              : sug.severity === 'medium'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {sug.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {sug.description}
                    </div>
                    {sug.affectedSchemas.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {sug.affectedSchemas.slice(0, 12).map((n) => (
                          <Badge key={n} variant="secondary">
                            {n}
                          </Badge>
                        ))}
                        {sug.affectedSchemas.length > 12 && (
                          <span>+{sug.affectedSchemas.length - 12}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* No Analytics Available */}
      {!isLoading && !analytics && totalSchemas > 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-lg font-medium">Analytics Not Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the refresh button to analyze your schemas
                </p>
                <Button
                  onClick={handleManualRefresh}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze Schemas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help / Explainer Modal */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>About Insights</DialogTitle>
            <DialogDescription>
              How suggestions are derived and how to interpret them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Categories</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <strong>Naming</strong>: Consolidate variants (e.g., Address)
                  or introduce a base with variants.
                </li>
                <li>
                  <strong>Reuse</strong>: Extract frequent inline structures;
                  align near-duplicates to central entities.
                </li>
                <li>
                  <strong>Field consistency</strong>: Unify
                  type/format/enum/requiredness across schemas.
                </li>
                <li>
                  <strong>References</strong>: Resolve circular refs. Normal
                  $ref reuse is good and not flagged.
                </li>
                <li>
                  <strong>Complexity</strong>: Reduce deeply nested/oversized
                  schemas.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Scoring</h4>
              <p className="text-muted-foreground">
                Severity (high/medium/low) drives ordering. Within the same
                severity, insights are sorted alphabetically by title.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Best practices</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  Prefer central shared entities; avoid duplicating their
                  structure inline.
                </li>
                <li>
                  Extract repeated inline structures into shared definitions and
                  reference them.
                </li>
                <li>
                  Use canonical formats for ids (uuid), timestamps (date-time),
                  email, uri.
                </li>
                <li>
                  For similar-but-distinct concepts, introduce a base schema
                  with variant overlays.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Controls</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  Use the search bar to filter insights. It matches against
                  title, description, category, severity, and affected schema
                  names.
                </li>
                <li>Search is client-side and debounced by 300ms.</li>
                <li>Filtering does not change the underlying analysis.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
