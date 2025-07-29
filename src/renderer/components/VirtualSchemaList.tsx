/**
 * Virtual schema list component for JSON Schema Editor.
 *
 * This component provides a performance-optimized schema list with virtual scrolling,
 * lazy loading, and memory management for handling large datasets efficiently.
 *
 * @module VirtualSchemaList
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, List, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { SchemaCard } from './SchemaCard';
import { SchemaSearch } from './schema/SchemaSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '../stores/useAppStore';
import { useVirtualScrolling, useVirtualGrid } from '../hooks/useVirtualScrolling';
import { useLazyLoading } from '../hooks/useLazyLoading';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import type { Schema } from '../../types/schema-editor';
import logger from '../lib/renderer-logger';

/**
 * Virtual schema list props.
 */
interface VirtualSchemaListProps {
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
  /** Container height for virtual scrolling */
  containerHeight?: number;
  /** Enable performance monitoring */
  enablePerformanceMode?: boolean;
}

/**
 * Schema list item component optimized for virtual rendering.
 */
const VirtualSchemaListItem = React.memo<{
  schema: Schema;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSchemaClick?: (schema: Schema) => void;
  onSchemaEdit?: (schema: Schema) => void;
  onSchemaView?: (schema: Schema) => void;
  style?: React.CSSProperties;
}>(({
  schema,
  viewMode,
  isSelected,
  onSchemaClick,
  onSchemaEdit,
  onSchemaView,
  style,
}) => {
  const handleClick = useCallback(() => {
    onSchemaClick?.(schema);
  }, [schema, onSchemaClick]);

  const handleEdit = useCallback(() => {
    onSchemaEdit?.(schema);
  }, [schema, onSchemaEdit]);

  const handleView = useCallback(() => {
    onSchemaView?.(schema);
  }, [schema, onSchemaView]);

  if (viewMode === 'list') {
    return (
      <div style={style} className="w-full">
        <Card 
          className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
            isSelected ? 'ring-2 ring-primary' : ''
          }`}
          onClick={handleClick}
        >
          <CardContent className="flex items-center space-x-4 p-4">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium truncate">{schema.name}</h3>
                <Badge 
                  variant={
                    schema.validationStatus === 'valid' ? 'default' :
                    schema.validationStatus === 'invalid' ? 'destructive' : 'secondary'
                  }
                  className="text-xs"
                >
                  {schema.validationStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {schema.metadata.title || schema.metadata.description || 'No description'}
              </p>
              <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                <span>{schema.metadata.fileSize ? `${(schema.metadata.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
                <span>{schema.metadata.lastModified?.toLocaleDateString() || 'Unknown date'}</span>
                {schema.referencedBy && schema.referencedBy.length > 0 && (
                  <span>{schema.referencedBy.length} references</span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView();
                }}
              >
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={style}>
      <SchemaCard
        schema={schema}
        selected={isSelected}
        onEdit={handleEdit}
        onView={handleView}
        onClick={handleClick}
      />
    </div>
  );
});

VirtualSchemaListItem.displayName = 'VirtualSchemaListItem';

/**
 * Virtual schema list component for displaying large schema collections efficiently.
 *
 * This component provides:
 * - Virtual scrolling for performance with large datasets
 * - Lazy loading to reduce initial load time
 * - Memory management and optimization
 * - Grid and list view modes
 * - Search functionality with debouncing
 * - Performance monitoring and metrics
 *
 * @param props - Component props
 * @returns JSX element representing the virtual schema list
 *
 * @example
 * ```tsx
 * <VirtualSchemaList
 *   schemas={projectSchemas}
 *   isLoading={false}
 *   onSchemaClick={handleSchemaClick}
 *   selectedSchemaId="schema-1"
 *   containerHeight={600}
 *   enablePerformanceMode={true}
 * />
 * ```
 */
export function VirtualSchemaList({
  schemas,
  isLoading = false,
  onSchemaClick,
  onSchemaEdit,
  onSchemaView,
  selectedSchemaId,
  containerHeight = 600,
  enablePerformanceMode = true,
}: VirtualSchemaListProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Get search state from store
  const searchQuery = useAppStore((state) => state.searchQuery);
  const searchFilters = useAppStore((state) => state.searchFilters);

  // Memory management
  const {
    memoryUsage,
    memoryStatus,
    optimizationSuggestions,
  } = useMemoryManagement({
    enableMonitoring: enablePerformanceMode,
    warningThreshold: 70,
    criticalThreshold: 85,
    cacheLimit: 50,
    enableCacheCleanup: true,
  });

  /**
   * Filter and sort schemas with caching.
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
      const matchesStatus =
        searchFilters.validationStatus === 'all' ||
        schema.validationStatus === searchFilters.validationStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort schemas
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (searchFilters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastModified':
          aValue = a.metadata.lastModified?.getTime() || 0;
          bValue = b.metadata.lastModified?.getTime() || 0;
          break;
        case 'fileSize':
          aValue = a.metadata.fileSize || 0;
          bValue = b.metadata.fileSize || 0;
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
   * Lazy loading for large datasets.
   */
  const {
    items: visibleSchemas,
    isLoading: isLazyLoading,
    hasMore,
    onScroll: onLazyScroll,
  } = useLazyLoading(filteredAndSortedSchemas, {
    initialCount: enablePerformanceMode ? 20 : filteredAndSortedSchemas.length,
    batchSize: 10,
    preloadThreshold: 5,
    autoLoad: true,
    debounceDelay: 150,
  });

  /**
   * Virtual scrolling for grid view.
   */
  const virtualGrid = useVirtualGrid(visibleSchemas, {
    itemWidth: 280,
    itemHeight: 240,
    containerWidth: Math.max(800, window.innerWidth - 320), // Subtract sidebar width
    containerHeight,
    gap: 16,
    overscan: 2,
  });

  /**
   * Virtual scrolling for list view.
   */
  const virtualList = useVirtualScrolling(visibleSchemas, {
    itemHeight: 100,
    containerHeight,
    overscan: 3,
    smoothScrolling: true,
  });

  /**
   * Handle scroll events for both virtual scrolling and lazy loading.
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (viewMode === 'grid') {
      virtualGrid.onScroll(event);
    } else {
      virtualList.onScroll(event);
    }

    // Trigger lazy loading
    if (enablePerformanceMode) {
      onLazyScroll(scrollTop, clientHeight, scrollHeight);
    }
  }, [viewMode, virtualGrid, virtualList, enablePerformanceMode, onLazyScroll]);

  /**
   * Get validation status counts for display.
   */
  const getStatusCounts = useCallback(() => {
    const counts = {
      all: filteredAndSortedSchemas.length,
      valid: 0,
      invalid: 0,
      error: 0,
      pending: 0,
    };

    filteredAndSortedSchemas.forEach((schema) => {
      counts[schema.validationStatus]++;
    });

    return counts;
  }, [filteredAndSortedSchemas]);

  /**
   * Render loading skeletons for virtual items.
   */
  const renderSkeletons = useCallback(() => {
    const skeletonCount = viewMode === 'grid' ? 12 : 8;
    const skeletons = Array.from({ length: skeletonCount }, (_, i) => (
      <div key={`skeleton-${i}`} className="space-y-3">
        <Skeleton className={viewMode === 'grid' ? "h-48 w-full" : "h-20 w-full"} />
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
      <div className="space-y-4">{skeletons}</div>
    );
  }, [viewMode]);

  /**
   * Render virtual grid items.
   */
  const renderGridItems = useCallback(() => {
    return (
      <div
        style={{
          position: 'relative',
          height: virtualGrid.totalHeight,
          overflow: 'hidden',
        }}
      >
        {virtualGrid.visibleItems.map(({ item: schema, index, x, y }) => (
          <VirtualSchemaListItem
            key={`${schema.id}-${index}`}
            schema={schema}
            viewMode="grid"
            isSelected={selectedSchemaId === schema.id}
            onSchemaClick={onSchemaClick}
            onSchemaEdit={onSchemaEdit}
            onSchemaView={onSchemaView}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 280,
              height: 240,
            }}
          />
        ))}
      </div>
    );
  }, [virtualGrid, selectedSchemaId, onSchemaClick, onSchemaEdit, onSchemaView]);

  /**
   * Render virtual list items.
   */
  const renderListItems = useCallback(() => {
    return (
      <div
        style={{
          position: 'relative',
          height: virtualList.totalHeight,
          paddingTop: virtualList.offsetY,
        }}
      >
        {virtualList.visibleItems.map(({ item: schema, index }) => (
          <VirtualSchemaListItem
            key={`${schema.id}-${index}`}
            schema={schema}
            viewMode="list"
            isSelected={selectedSchemaId === schema.id}
            onSchemaClick={onSchemaClick}
            onSchemaEdit={onSchemaEdit}
            onSchemaView={onSchemaView}
            style={{
              height: 100,
              marginBottom: 8,
            }}
          />
        ))}
      </div>
    );
  }, [virtualList, selectedSchemaId, onSchemaClick, onSchemaEdit, onSchemaView]);

  /**
   * Log performance metrics.
   */
  useEffect(() => {
    if (enablePerformanceMode && filteredAndSortedSchemas.length > 0) {
      logger.info('VirtualSchemaList performance metrics', {
        totalSchemas: schemas.length,
        filteredSchemas: filteredAndSortedSchemas.length,
        visibleSchemas: visibleSchemas.length,
        viewMode,
        memoryStatus,
        memoryUsage: memoryUsage?.usedReadable,
      });
    }
  }, [
    enablePerformanceMode,
    schemas.length,
    filteredAndSortedSchemas.length,
    visibleSchemas.length,
    viewMode,
    memoryStatus,
    memoryUsage,
  ]);

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-4">
      {/* Performance Status */}
      {enablePerformanceMode && memoryStatus !== 'normal' && (
        <Card className={`${memoryStatus === 'critical' ? 'border-red-500' : 'border-yellow-500'}`}>
          <CardContent className="flex items-center space-x-3 p-4">
            <AlertTriangle className={`h-5 w-5 ${memoryStatus === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Memory usage is {memoryStatus} ({memoryUsage?.usagePercentage.toFixed(1)}%)
              </p>
              {optimizationSuggestions.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {optimizationSuggestions[0]}
                </p>
              )}
            </div>
            {memoryUsage && (
              <Badge variant={memoryStatus === 'critical' ? 'destructive' : 'secondary'}>
                {memoryUsage.usedReadable} / {memoryUsage.totalReadable}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <SchemaSearch
        isExpanded={isSearchExpanded}
        onToggleExpanded={() => setIsSearchExpanded(!isSearchExpanded)}
      />

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Badges */}
          <Badge variant="outline" className="text-xs">
            All: {statusCounts.all}
          </Badge>
          {statusCounts.valid > 0 && (
            <Badge variant="default" className="text-xs">
              Valid: {statusCounts.valid}
            </Badge>
          )}
          {statusCounts.invalid > 0 && (
            <Badge variant="destructive" className="text-xs">
              Invalid: {statusCounts.invalid}
            </Badge>
          )}
          {statusCounts.error > 0 && (
            <Badge variant="secondary" className="text-xs">
              Error: {statusCounts.error}
            </Badge>
          )}
        </div>
      </div>

      {/* Schema List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              {renderSkeletons()}
            </div>
          ) : filteredAndSortedSchemas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No schemas found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || searchFilters.validationStatus !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'No schemas are available in this project.'}
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={viewMode === 'grid' ? virtualGrid.containerRef : virtualList.containerRef}
              className="overflow-auto"
              style={{ height: containerHeight }}
              onScroll={handleScroll}
            >
              <div className="p-4">
                {viewMode === 'grid' ? renderGridItems() : renderListItems()}
                
                {/* Lazy Loading Indicator */}
                {(isLazyLoading || hasMore) && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      {isLazyLoading ? 'Loading more schemas...' : 'Scroll to load more'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
