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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, List, FileText } from 'lucide-react';
import { SchemaCard } from './SchemaCard';
import { SchemaSearch } from './schema/SchemaSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '../stores/useAppStore';
import type { Schema } from '../../types/schema-editor';

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Get search state from store
  const searchQuery = useAppStore((state) => state.searchQuery);
  const searchFilters = useAppStore((state) => state.searchFilters);

  /**
   * Filters and sorts schemas based on current state.
   */
  const filteredAndSortedSchemas = useMemo(() => {
    let filtered = schemas.filter((schema) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (schema.metadata.title &&
          schema.metadata.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (schema.metadata.description &&
          schema.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = searchFilters.validationStatus === 'all' || schema.validationStatus === searchFilters.validationStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort schemas
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (searchFilters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
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

      if (searchFilters.sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [schemas, searchQuery, searchFilters]);

  /**
   * Gets validation status counts for display.
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

  /**
   * Renders loading skeletons.
   */
  const renderSkeletons = () => {
    const skeletons = Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-48 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ));

    return viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {skeletons}
      </div>
    ) : (
      <div className="space-y-4">
        {skeletons.map((skeleton, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <SchemaSearch
        isExpanded={isSearchExpanded}
        onToggleExpanded={() => setIsSearchExpanded(!isSearchExpanded)}
      />

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>
              {filteredAndSortedSchemas.length} of {schemas.length} schemas
            </span>
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            All: {statusCounts.all}
          </Badge>
          <Badge variant="default" className="text-xs">
            Valid: {statusCounts.valid}
          </Badge>
          <Badge variant="destructive" className="text-xs">
            Issues: {statusCounts.invalid + statusCounts.error}
          </Badge>
        </div>
      </div>

      {/* Schema List */}
      {isLoading ? (
        renderSkeletons()
      ) : filteredAndSortedSchemas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No schemas found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery || searchFilters.validationStatus !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'No schemas available in this project'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedSchemas.map((schema) => (
            <SchemaCard
              key={schema.id}
              schema={schema}
              onClick={onSchemaClick}
              onEdit={onSchemaEdit}
              onView={onSchemaView}
              selected={selectedSchemaId === schema.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedSchemas.map((schema) => (
            <SchemaCard
              key={schema.id}
              schema={schema}
              onClick={onSchemaClick}
              onEdit={onSchemaEdit}
              onView={onSchemaView}
              selected={selectedSchemaId === schema.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
