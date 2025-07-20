/**
 * Explore page component for JSON Schema Editor.
 *
 * This component provides schema exploration and analytics functionality.
 *
 * @module Explore
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Search, BarChart3 } from 'lucide-react';
import { SchemaList } from '../components/SchemaList';
import { useAppStore } from '../stores/useAppStore';

/**
 * Explore page component for schema exploration.
 *
 * This component provides:
 * - Schema grid/list views
 * - Search and filtering
 * - Schema detail modals
 * - Analytics dashboard
 *
 * @returns JSX element representing the explore page
 *
 * @example
 * ```tsx
 * <Explore />
 * ```
 */
export function Explore(): React.JSX.Element {
    const currentProject = useAppStore((state) => state.currentProject);

    if (!currentProject) {
        return (
            <div className="px-4 lg:px-6">
                <Card className="glass-blue border-0">
                    <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Explore Schemas
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Browse, search, and analyze your JSON schemas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-4">
                                <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="text-lg font-medium">No Project Loaded</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Load a project to explore its schemas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="px-4 lg:px-6 space-y-6">
            {/* Schema Exploration Header */}
            <Card className="glass-blue border-0">
                <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Explore Schemas
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Browse, search, and analyze schemas in {currentProject.name}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg border border-border/50">
                            <Search className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <h4 className="font-medium">Schema Grid</h4>
                            <p className="text-xs text-muted-foreground">
                                Browse schemas in grid or list view
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border border-border/50">
                            <Search className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <h4 className="font-medium">Search & Filter</h4>
                            <p className="text-xs text-muted-foreground">
                                Find schemas by name, content, or status
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border border-border/50">
                            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <h4 className="font-medium">Analytics</h4>
                            <p className="text-xs text-muted-foreground">
                                View schema statistics and insights
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Schema List */}
            <Card className="glass-blue border-0">
                <CardHeader>
                    <CardTitle>Schemas</CardTitle>
                    <CardDescription>
                        Browse and manage schemas in your project
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SchemaList
                        schemas={currentProject.schemas || []}
                        isLoading={false}
                        onSchemaClick={(_schema) => {
                            // TODO: Handle schema selection
                            console.log('Schema clicked:', _schema);
                        }}
                        onSchemaEdit={(_schema) => {
                            // TODO: Navigate to build page with schema
                            console.log('Edit schema:', _schema);
                        }}
                        onSchemaView={(_schema) => {
                            // TODO: Show schema detail modal
                            console.log('View schema:', _schema);
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
} 