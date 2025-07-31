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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Network,
  Zap,
  Target,
  GitBranch,
  Eye,
  ArrowRight,
  Layers,
  Download,
  ExternalLink,
  Maximize,
  Server,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { analyticsService, type AnalyticsResult } from '../services/analytics';
import logger from '../lib/renderer-logger';
import { safeHandler } from '../lib/error-handling';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze schemas when project changes
  useEffect(() => {
    if (currentProject?.schemas && currentProject.schemas.length > 0) {
      analyzeSchemas(false); // Don't show toast for automatic analysis
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

      const result = await analyticsService.analyzeSchemas(currentProject.schemas);
      setAnalytics(result);

      logger.info('Schema analysis completed', {
        duration: result.performance.duration,
        circularReferences: result.circularReferences.length,
        totalSchemas: result.projectMetrics.totalSchemas,
        isManualRefresh: showToast,
      });

      // Only show success toast for manual refreshes
      if (showToast) {
        toast.success('Analytics updated', {
          description: `Analyzed ${result.projectMetrics.totalSchemas} schemas in ${result.performance.duration}ms`,
        });
      }
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

  // Chart colors
  const COLORS = {
    valid: '#22c55e',
    invalid: '#ef4444',
    error: '#f97316',
    pending: '#eab308',
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',
  };

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

  // Basic stats for header
  const validSchemas = schemas.filter((s) => s.validationStatus === 'valid').length;
  const invalidSchemas = schemas.filter((s) => s.validationStatus === 'invalid').length;
  const errorSchemas = schemas.filter((s) => s.validationStatus === 'error').length;
  const pendingSchemas = schemas.filter((s) => s.validationStatus === 'pending').length;

  const validationPercentage = totalSchemas > 0 ? (validSchemas / totalSchemas) * 100 : 0;
  const averageFileSize =
    totalSchemas > 0 ? schemas.reduce((sum, s) => sum + s.metadata.fileSize, 0) / totalSchemas : 0;

  // Prepare chart data
  const validationData = [
    { name: 'Valid', value: validSchemas, color: COLORS.valid },
    { name: 'Invalid', value: invalidSchemas, color: COLORS.invalid },
    { name: 'Error', value: errorSchemas, color: COLORS.error },
    { name: 'Pending', value: pendingSchemas, color: COLORS.pending },
  ].filter((item) => item.value > 0);

  // Complexity distribution data
  const complexityData = useMemo(() => {
    if (!analytics?.complexityMetrics) return [];

    const ranges = [
      { name: 'Low (0-25)', min: 0, max: 25, count: 0 },
      { name: 'Medium (26-50)', min: 26, max: 50, count: 0 },
      { name: 'High (51-75)', min: 51, max: 75, count: 0 },
      { name: 'Very High (76-100)', min: 76, max: 100, count: 0 },
    ];

    analytics.complexityMetrics.forEach((metrics) => {
      const score = metrics.complexityScore;
      const range = ranges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    return ranges.filter((r) => r.count > 0);
  }, [analytics?.complexityMetrics]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Analytics Header */}
      <Card className="glass-blue border-0">
        <CardContent className="p-4">
          <div className="flex justify-end">
            <Button
              onClick={handleManualRefresh}
              disabled={isLoading || totalSchemas === 0}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schemas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchemas}</div>
            <p className="text-xs text-muted-foreground">
              {analytics
                ? `Analyzed ${analytics.performance.duration}ms ago`
                : 'Click refresh to analyze'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationPercentage.toFixed(1)}%</div>
            <Progress value={validationPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {validSchemas} valid, {invalidSchemas + errorSchemas} issues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circular References</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.circularReferences.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.projectMetrics.circularSchemas.length || 0} schemas affected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Complexity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.projectMetrics.averageComplexity.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most complex: {analytics?.projectMetrics.mostComplexSchema || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      {!isLoading && analytics && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="complexity">Complexity</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Validation Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Validation Status
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Distribution of schema validation results
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={validationData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) =>
                            `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {validationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Complexity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Complexity Distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Schema complexity score ranges</p>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={complexityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill={COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Health Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Project Health
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Key metrics and indicators for project quality
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Validation Health</span>
                      <Badge
                        variant={
                          validationPercentage > 80
                            ? 'default'
                            : validationPercentage > 60
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {validationPercentage > 80
                          ? 'Excellent'
                          : validationPercentage > 60
                            ? 'Good'
                            : 'Needs Work'}
                      </Badge>
                    </div>
                    <Progress value={validationPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {validSchemas}/{totalSchemas} schemas valid
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reference Health</span>
                      <Badge
                        variant={
                          analytics.circularReferences.length === 0 ? 'default' : 'destructive'
                        }
                      >
                        {analytics.circularReferences.length === 0 ? 'Clean' : 'Issues Found'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analytics.referenceGraph.metrics.nodeCount} nodes,{' '}
                      {analytics.referenceGraph.metrics.edgeCount} edges
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Density: {(analytics.referenceGraph.metrics.density * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Complexity Health</span>
                      <Badge
                        variant={
                          analytics.projectMetrics.averageComplexity < 50
                            ? 'default'
                            : analytics.projectMetrics.averageComplexity < 75
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {analytics.projectMetrics.averageComplexity < 50
                          ? 'Simple'
                          : analytics.projectMetrics.averageComplexity < 75
                            ? 'Moderate'
                            : 'Complex'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {analytics.projectMetrics.averageComplexity.toFixed(1)}/100
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.projectMetrics.orphanedSchemas.length} orphaned schemas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complexity Tab */}
          <TabsContent value="complexity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Complexity Scatter Plot */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Complexity vs Size
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Schema complexity plotted against file size
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        data={Array.from(analytics.complexityMetrics.entries()).map(
                          ([id, metrics]) => ({
                            name: id,
                            complexity: metrics.complexityScore,
                            size: metrics.sizeBytes / 1024, // Convert to KB
                            properties: metrics.propertyCount,
                          }),
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="size" name="Size (KB)" />
                        <YAxis dataKey="complexity" name="Complexity" />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded p-2 shadow-md">
                                  <p className="font-medium">{data.name}</p>
                                  <p className="text-sm">Complexity: {data.complexity}</p>
                                  <p className="text-sm">Size: {data.size.toFixed(1)} KB</p>
                                  <p className="text-sm">Properties: {data.properties}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter dataKey="complexity" fill={COLORS.primary} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Complex Schemas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Most Complex Schemas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Schemas with highest complexity scores
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {Array.from(analytics.complexityMetrics.entries())
                        .sort(([, a], [, b]) => b.complexityScore - a.complexityScore)
                        .slice(0, 10)
                        .map(([id, metrics]) => {
                          const schema = schemas.find((s) => s.id === id);
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between p-3 border rounded"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {schema?.metadata.title || schema?.name || id}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{metrics.propertyCount} properties</span>
                                  <span>Depth: {metrics.maxDepth}</span>
                                  <span>{(metrics.sizeBytes / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    metrics.complexityScore > 75
                                      ? 'destructive'
                                      : metrics.complexityScore > 50
                                        ? 'secondary'
                                        : 'default'
                                  }
                                >
                                  {metrics.complexityScore.toFixed(0)}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* References Tab */}
          <TabsContent value="references" className="space-y-6">
            {/* Circular References */}
            {analytics.circularReferences.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Circular References List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          Circular References
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {analytics.circularReferences.length} circular dependencies detected
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {analytics.circularReferences.map((ref, index) => (
                          <Alert
                            key={index}
                            variant={ref.severity === 'high' ? 'destructive' : 'default'}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {ref.type === 'direct' ? 'Direct' : 'Indirect'} Reference
                                <Badge
                                  variant={
                                    ref.severity === 'high'
                                      ? 'destructive'
                                      : ref.severity === 'medium'
                                        ? 'secondary'
                                        : 'default'
                                  }
                                >
                                  {ref.severity}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </AlertTitle>
                            <AlertDescription>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Layers className="w-3 h-3" />
                                  <span>Depth: {ref.depth} levels</span>
                                </div>
                                <div className="bg-muted/30 p-2 rounded text-xs font-mono">
                                  {ref.path.map((step, i) => (
                                    <span key={i}>
                                      {step}
                                      {i < ref.path.length - 1 && (
                                        <ArrowRight className="w-3 h-3 inline mx-1" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Type: {ref.type} • Severity: {ref.severity}
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Circular Reference Visualization */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      Reference Flow
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Visual representation of circular dependencies
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="relative">
                          {/* Simple circular reference visualization */}
                          <div className="w-32 h-32 border-4 border-dashed border-destructive rounded-full flex items-center justify-center">
                            <div className="text-center">
                              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                              <div className="text-sm font-medium">
                                {analytics.circularReferences.length}
                              </div>
                              <div className="text-xs text-muted-foreground">Cycles</div>
                            </div>
                          </div>
                          {/* Animated arrows */}
                          <div
                            className="absolute inset-0 animate-spin"
                            style={{ animationDuration: '8s' }}
                          >
                            <ArrowRight className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-4 h-4 text-destructive" />
                            <ArrowRight className="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2 rotate-90 w-4 h-4 text-destructive" />
                            <ArrowRight className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 rotate-180 w-4 h-4 text-destructive" />
                            <ArrowRight className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2 -rotate-90 w-4 h-4 text-destructive" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Severity Breakdown</div>
                          <div className="flex gap-2 justify-center">
                            {['high', 'medium', 'low'].map((severity) => {
                              const count = analytics.circularReferences.filter(
                                (ref) => ref.severity === severity,
                              ).length;
                              return count > 0 ? (
                                <Badge
                                  key={severity}
                                  variant={
                                    severity === 'high'
                                      ? 'destructive'
                                      : severity === 'medium'
                                        ? 'secondary'
                                        : 'default'
                                  }
                                  className="text-xs"
                                >
                                  {severity}: {count}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                    <div>
                      <h3 className="text-lg font-medium">No Circular References</h3>
                      <p className="text-sm text-muted-foreground">
                        Your schema references are clean and well-structured
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interactive Reference Graph */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      Interactive Reference Graph
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Explore schema relationships and dependencies
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Maximize className="w-4 h-4 mr-2" />
                      Fullscreen
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] border rounded-lg bg-muted/20 relative overflow-hidden">
                  {/* Graph Visualization Area */}
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      {/* Central Hub */}
                      <div className="relative">
                        <div className="w-24 h-24 bg-primary/10 border-2 border-primary rounded-full flex items-center justify-center">
                          <div className="text-center">
                            <Server className="w-6 h-6 mx-auto mb-1" />
                            <div className="text-xs font-medium">Core</div>
                          </div>
                        </div>

                        {/* Connected Nodes */}
                        {analytics.referenceGraph.nodes.slice(0, 6).map((node, index) => {
                          const angle = index * 60 * (Math.PI / 180);
                          const radius = 80;
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;

                          return (
                            <div
                              key={node.id}
                              className="absolute w-16 h-16 bg-background border-2 border-border rounded-full flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                              style={{
                                left: `calc(50% + ${x}px - 32px)`,
                                top: `calc(50% + ${y}px - 32px)`,
                              }}
                              title={node.name}
                            >
                              <div className="text-center">
                                <FileText className="w-4 h-4 mx-auto mb-1" />
                                <div className="text-xs font-medium truncate w-12">
                                  {node.name.split('.')[0]}
                                </div>
                              </div>

                              {/* Connection Line */}
                              <svg
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  width: '200px',
                                  height: '200px',
                                  left: '-84px',
                                  top: '-84px',
                                }}
                              >
                                <line
                                  x1="100"
                                  y1="100"
                                  x2={100 - x}
                                  y2={100 - y}
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  className="text-border opacity-40"
                                />
                              </svg>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Click nodes to explore connections
                      </div>
                    </div>
                  </div>

                  {/* Graph Controls */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm border rounded p-3 space-y-2">
                    <div className="text-xs font-medium">Legend</div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-primary/10 border border-primary rounded-full"></div>
                      <span>Core Schema</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 bg-background border border-border rounded-full"></div>
                      <span>Referenced Schema</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-0 border-t border-border"></div>
                      <span>Reference Link</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reference Graph Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Graph Metrics
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Network analysis of schema references
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded hover:bg-accent/50 transition-colors">
                        <div className="text-2xl font-bold text-primary">
                          {analytics.referenceGraph.metrics.nodeCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Nodes</div>
                      </div>
                      <div className="text-center p-3 border rounded hover:bg-accent/50 transition-colors">
                        <div className="text-2xl font-bold text-primary">
                          {analytics.referenceGraph.metrics.edgeCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Edges</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Graph Density</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{
                                width: `${analytics.referenceGraph.metrics.density * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium min-w-[3rem]">
                            {(analytics.referenceGraph.metrics.density * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Degree</span>
                        <span className="text-sm font-medium">
                          {analytics.referenceGraph.metrics.averageDegree.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Connected Components</span>
                        <Badge variant="outline">
                          {analytics.referenceGraph.metrics.connectedComponents}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Circular References</span>
                        <Badge
                          variant={
                            analytics.circularReferences.length > 0 ? 'destructive' : 'default'
                          }
                        >
                          {analytics.circularReferences.length}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Most Referenced Schemas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Most Referenced
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Schemas with highest reference counts
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {analytics.referenceGraph.nodes
                        .sort((a, b) => b.inDegree - a.inDegree)
                        .slice(0, 15)
                        .map((node, index) => {
                          const schema = schemas.find((s) => s.id === node.id);
                          const maxInDegree = Math.max(
                            ...analytics.referenceGraph.nodes.map((n) => n.inDegree),
                          );
                          const barWidth =
                            maxInDegree > 0 ? (node.inDegree / maxInDegree) * 100 : 0;

                          return (
                            <div
                              key={node.id}
                              className="group relative p-3 border rounded-lg hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                            >
                              {/* Rank indicator */}
                              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0
                                      ? 'bg-yellow-500 text-yellow-900'
                                      : index === 1
                                        ? 'bg-gray-400 text-gray-900'
                                        : index === 2
                                          ? 'bg-amber-600 text-amber-100'
                                          : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                              </div>

                              <div className="ml-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                                      {schema?.metadata.title || schema?.name || node.name}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>Centrality: {node.centrality.toFixed(2)}</span>
                                      <span>•</span>
                                      <span>Out: {node.outDegree}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={index < 3 ? 'default' : 'outline'}
                                      className={index < 3 ? 'bg-primary' : ''}
                                    >
                                      {node.inDegree} refs
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Reference bar */}
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {analytics.referenceGraph.nodes.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No reference data available</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Analysis Performance
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Performance metrics from the last analysis run
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold">{analytics.performance.duration}</div>
                        <div className="text-sm text-muted-foreground">ms</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold">
                          {(analytics.performance.memoryUsage / 1024 / 1024).toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">MB</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Analysis Time</span>
                        <span className="text-sm font-medium">
                          {new Date(analytics.performance.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Schemas/sec</span>
                        <span className="text-sm font-medium">
                          {(totalSchemas / (analytics.performance.duration / 1000)).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg File Size</span>
                        <span className="text-sm font-medium">
                          {(averageFileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File Size Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    File Size Distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Distribution of schema file sizes</p>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={schemas
                          .map((s) => ({ size: s.metadata.fileSize / 1024, name: s.name }))
                          .sort((a, b) => a.size - b.size)
                          .map((item, index) => ({ ...item, index }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => `Schema ${value + 1}`}
                          formatter={(value: number, _name) => [
                            `${value.toFixed(1)} KB`,
                            'File Size',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="size"
                          stroke={COLORS.primary}
                          fill={COLORS.primary}
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cache Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Cache Statistics
                </CardTitle>
                <p className="text-sm text-muted-foreground">Analytics service cache performance</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-lg font-bold">{analyticsService.getCacheStats().size}</div>
                    <div className="text-sm text-muted-foreground">Cached Results</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-lg font-bold">
                      {(analytics.performance.memoryUsage / 1024 / 1024).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Memory (MB)</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Button
                      onClick={() => {
                        analyticsService.clearCache();
                        toast.success('Cache cleared');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
                <Button onClick={handleManualRefresh} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Analyze Schemas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
