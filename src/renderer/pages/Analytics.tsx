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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
      <div className="px-4 lg:px-6">
        <Card className="glass-blue border-0">
          <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Schema Analytics
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Comprehensive project-wide schema analysis and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
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
    <div className="px-4 lg:px-6 space-y-6">
      {/* Analytics Header */}
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Schema Analytics
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Comprehensive analysis for {currentProject.name} ({totalSchemas} schemas)
              </CardDescription>
            </div>
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
        </CardHeader>
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
                  <CardDescription>Distribution of schema validation results</CardDescription>
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
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
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
                  <CardDescription>Schema complexity score ranges</CardDescription>
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
                <CardDescription>Key metrics and indicators for project quality</CardDescription>
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
                  <CardDescription>Schema complexity plotted against file size</CardDescription>
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
                  <CardDescription>Schemas with highest complexity scores</CardDescription>
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
            {analytics.circularReferences.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Circular References Detected
                  </CardTitle>
                  <CardDescription>
                    These circular references may cause issues in schema processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {analytics.circularReferences.map((ref, index) => (
                        <Alert
                          key={index}
                          variant={ref.severity === 'high' ? 'destructive' : 'default'}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="flex items-center gap-2">
                            {ref.type === 'direct' ? 'Direct' : 'Indirect'} Circular Reference
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
                          </AlertTitle>
                          <AlertDescription>
                            <div className="mt-2">
                              <p className="text-sm">Path: {ref.path.join(' → ')}</p>
                              <p className="text-sm">Depth: {ref.depth} levels</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Reference Graph Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Reference Graph
                  </CardTitle>
                  <CardDescription>Network analysis of schema references</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold">
                          {analytics.referenceGraph.metrics.nodeCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Nodes</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold">
                          {analytics.referenceGraph.metrics.edgeCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Edges</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Graph Density</span>
                        <span className="text-sm font-medium">
                          {(analytics.referenceGraph.metrics.density * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Average Degree</span>
                        <span className="text-sm font-medium">
                          {analytics.referenceGraph.metrics.averageDegree.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Connected Components</span>
                        <span className="text-sm font-medium">
                          {analytics.referenceGraph.metrics.connectedComponents}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Most Referenced Schemas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Most Referenced
                  </CardTitle>
                  <CardDescription>Schemas with highest reference counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {analytics.referenceGraph.nodes
                        .sort((a, b) => b.inDegree - a.inDegree)
                        .slice(0, 10)
                        .map((node) => {
                          const schema = schemas.find((s) => s.id === node.id);
                          return (
                            <div
                              key={node.id}
                              className="flex items-center justify-between p-3 border rounded"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {schema?.metadata.title || schema?.name || node.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Centrality: {node.centrality.toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{node.inDegree} refs</Badge>
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
                  <CardDescription>Performance metrics from the last analysis run</CardDescription>
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
                  <CardDescription>Distribution of schema file sizes</CardDescription>
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
                <CardDescription>Analytics service cache performance</CardDescription>
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
