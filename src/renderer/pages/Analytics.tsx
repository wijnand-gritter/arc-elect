/**
 * Analytics page component for JSON Schema Editor.
 *
 * This component provides project-wide schema analytics and insights
 * including validation statistics, complexity metrics, and performance data.
 *
 * @module Analytics
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
    BarChart3,
    CheckCircle,
    AlertCircle,
    Clock,
    FileText,
    Activity,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Analytics page component for project-wide schema insights.
 *
 * This component provides:
 * - Validation statistics overview
 * - Schema complexity metrics
 * - Performance insights
 * - Project health indicators
 *
 * @returns JSX element representing the analytics page
 *
 * @example
 * ```tsx
 * <Analytics />
 * ```
 */
export function Analytics(): React.JSX.Element {
    const currentProject = useAppStore((state) => state.currentProject);

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
                            View project-wide schema statistics and insights
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-4">
                                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="text-lg font-medium">No Project Loaded</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Load a project to view analytics
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
    const validSchemas = schemas.filter(s => s.validationStatus === 'valid').length;
    const invalidSchemas = schemas.filter(s => s.validationStatus === 'invalid').length;
    const errorSchemas = schemas.filter(s => s.validationStatus === 'error').length;
    const pendingSchemas = schemas.filter(s => s.validationStatus === 'pending').length;

    const validationPercentage = totalSchemas > 0 ? (validSchemas / totalSchemas) * 100 : 0;
    const averageFileSize = totalSchemas > 0
        ? schemas.reduce((sum, s) => sum + s.metadata.fileSize, 0) / totalSchemas
        : 0;

    return (
        <div className="px-4 lg:px-6 space-y-6">
            {/* Analytics Header */}
            <Card className="glass-blue border-0">
                <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Schema Analytics
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Project-wide statistics and insights for {currentProject.name}
                    </CardDescription>
                </CardHeader>
            </Card>

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
                            Schema files in project
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valid Schemas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{validSchemas}</div>
                        <p className="text-xs text-muted-foreground">
                            {validationPercentage.toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Issues</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{invalidSchemas + errorSchemas}</div>
                        <p className="text-xs text-muted-foreground">
                            Invalid or error schemas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingSchemas}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting validation
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Validation Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Validation Overview</CardTitle>
                    <CardDescription>Schema validation status distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Validation Progress</span>
                            <span className="text-sm text-muted-foreground">
                                {validSchemas} of {totalSchemas} schemas valid
                            </span>
                        </div>
                        <Progress value={validationPercentage} className="w-full" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Valid: {validSchemas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Invalid: {invalidSchemas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">Error: {errorSchemas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">Pending: {pendingSchemas}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>File Size Analysis</CardTitle>
                        <CardDescription>Average file size and distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="text-2xl font-bold">
                                    {(averageFileSize / 1024).toFixed(1)} KB
                                </div>
                                <p className="text-xs text-muted-foreground">Average file size</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {schemas.length > 0 ? 'Size distribution available' : 'No schemas to analyze'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Project Health</CardTitle>
                        <CardDescription>Overall project status indicators</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Validation Rate</span>
                                <Badge variant={validationPercentage >= 90 ? 'default' : validationPercentage >= 70 ? 'secondary' : 'destructive'}>
                                    {validationPercentage.toFixed(1)}%
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Schema Count</span>
                                <Badge variant={totalSchemas > 0 ? 'default' : 'secondary'}>
                                    {totalSchemas} schemas
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Issues</span>
                                <Badge variant={invalidSchemas + errorSchemas === 0 ? 'default' : 'destructive'}>
                                    {invalidSchemas + errorSchemas} issues
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest schema changes and updates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {schemas.length > 0 ? (
                            <div className="space-y-2">
                                {schemas
                                    .sort((a, b) => b.metadata.lastModified.getTime() - a.metadata.lastModified.getTime())
                                    .slice(0, 5)
                                    .map((schema) => (
                                        <div key={schema.id} className="flex items-center justify-between p-2 rounded-lg border">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{schema.name}</span>
                                                <Badge variant={schema.validationStatus === 'valid' ? 'default' : 'destructive'}>
                                                    {schema.validationStatus}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(schema.metadata.lastModified).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No recent activity</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 