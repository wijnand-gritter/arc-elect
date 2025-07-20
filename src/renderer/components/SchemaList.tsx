/**
 * Schema list component for JSON Schema Editor.
 *
 * This component displays a list of schemas with different view modes
 * and provides filtering and sorting capabilities.
 *
 * @module SchemaList
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, List, Search, Filter, SortAsc, FileText } from 'lucide-react';
import { SchemaCard } from './SchemaCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Schema, ValidationStatus, SortField } from '../../types/schema-editor';

/**
 * Schema list props.
 */
interface SchemaListProps {
    /** Array of schemas to display */
    schemas: Schema[];
    /** Whether the list is loading */
    isLoading?: boolean;
    /** Function called when a schema is clicked */
    onSchemaClick?: (schema: Schema) => void;
    /** Function called when edit button is clicked */
    onSchemaEdit?: (schema: Schema) => void;
    /** Function called when view button is clicked */
    onSchemaView?: (schema: Schema) => void;
    /** Currently selected schema ID */
    selectedSchemaId?: string;
}

/**
 * Schema list component for displaying schemas with filtering and sorting.
 *
 * This component provides:
 * - Grid and list view modes
 * - Search functionality
 * - Filtering by validation status
 * - Sorting by various fields
 * - Loading states with skeletons
 *
 * @param props - Component props
 * @returns JSX element representing the schema list
 *
 * @example
 * ```tsx
 * <SchemaList
 *   schemas={projectSchemas}
 *   isLoading={false}
 *   onSchemaClick={handleSchemaClick}
 *   selectedSchemaId="schema-1"
 * />
 * ```
 */
export function SchemaList({
    schemas,
    isLoading = false,
    onSchemaClick,
    onSchemaEdit,
    onSchemaView,
    selectedSchemaId,
}: SchemaListProps): React.JSX.Element {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ValidationStatus | 'all'>('all');
    const [sortBy, setSortBy] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    /**
     * Filters and sorts schemas based on current state.
     */
    const filteredAndSortedSchemas = useMemo(() => {
        let filtered = schemas.filter((schema) => {
            // Search filter
            const matchesSearch = searchTerm === '' ||
                schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (schema.metadata.title && schema.metadata.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (schema.metadata.description && schema.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()));

            // Status filter
            const matchesStatus = statusFilter === 'all' || schema.validationStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Sort schemas
        filtered.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'title':
                    aValue = (a.metadata.title || a.name).toLowerCase();
                    bValue = (b.metadata.title || b.name).toLowerCase();
                    break;
                case 'lastModified':
                    aValue = a.metadata.lastModified.getTime();
                    bValue = b.metadata.lastModified.getTime();
                    break;
                case 'fileSize':
                    aValue = a.metadata.fileSize;
                    bValue = b.metadata.fileSize;
                    break;
                case 'validationStatus':
                    aValue = a.validationStatus;
                    bValue = b.validationStatus;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [schemas, searchTerm, statusFilter, sortBy, sortDirection]);

    /**
     * Gets validation status counts for filter display.
     */
    const getStatusCounts = () => {
        const counts = {
            all: schemas.length,
            valid: 0,
            invalid: 0,
            error: 0,
            pending: 0,
        };

        schemas.forEach((schema) => {
            counts[schema.validationStatus]++;
        });

        return counts;
    };

    const statusCounts = getStatusCounts();

    /**
     * Renders loading skeletons.
     */
    const renderSkeletons = () => {
        const skeletonCount = 6;
        return Array.from({ length: skeletonCount }).map((_, index) => (
            <Card key={index} className="animate-pulse">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                            <Skeleton className="w-5 h-5" />
                            <div className="flex-1">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                        <Skeleton className="w-16 h-6" />
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 flex-1" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        ));
    };

    return (
        <div className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Schemas</h2>
                    <Badge variant="outline">{filteredAndSortedSchemas.length} schemas</Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center border rounded-md">
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="rounded-r-none"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="rounded-l-none"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Search and filters */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search schemas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ValidationStatus | 'all')}>
                    <SelectTrigger className="w-40">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                        <SelectItem value="valid">Valid ({statusCounts.valid})</SelectItem>
                        <SelectItem value="invalid">Invalid ({statusCounts.invalid})</SelectItem>
                        <SelectItem value="error">Error ({statusCounts.error})</SelectItem>
                        <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                    </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortField)}>
                    <SelectTrigger className="w-40">
                        <SortAsc className="w-4 h-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="lastModified">Last Modified</SelectItem>
                        <SelectItem value="fileSize">File Size</SelectItem>
                        <SelectItem value="validationStatus">Status</SelectItem>
                    </SelectContent>
                </Select>

                {/* Sort direction */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                    <SortAsc className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
            </div>

            {/* Schema grid/list */}
            {isLoading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                    {renderSkeletons()}
                </div>
            ) : filteredAndSortedSchemas.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <CardTitle className="text-lg mb-2">No schemas found</CardTitle>
                        <CardDescription>
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'No schemas have been loaded yet'
                            }
                        </CardDescription>
                    </CardContent>
                </Card>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                    {filteredAndSortedSchemas.map((schema) => (
                        <SchemaCard
                            key={schema.id}
                            schema={schema}
                            onClick={onSchemaClick || undefined}
                            onEdit={onSchemaEdit || undefined}
                            onView={onSchemaView || undefined}
                            selected={selectedSchemaId === schema.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 