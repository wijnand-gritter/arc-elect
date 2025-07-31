/**
 * Explore page component for JSON Schema Editor.
 *
 * This component provides schema exploration and analytics functionality.
 *
 * @module Explore
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useCallback, useState, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  FileText,
  Edit,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  X,
} from 'lucide-react';
import { SchemaDetailModal } from '../components/schema/SchemaDetailModal';
import { useAppStore } from '../stores/useAppStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import type { Schema } from '../../types/schema-editor';

/**
 * Determines the schema type based on its folder structure.
 */
function getSchemaType(schema: Schema): {
  type: string;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  // Use relativePath if available, otherwise fall back to name
  const path = (schema.relativePath || schema.name || '').toLowerCase();

  // Check for common patterns in the path
  if (path.includes('business-objects') || path.includes('businessobjects')) {
    return { type: 'business-object', label: 'Business Object', variant: 'default' };
  }

  if (path.includes('common/enums') || path.includes('enums')) {
    return { type: 'enum', label: 'Enum', variant: 'secondary' };
  }

  if (path.includes('common/') || path.includes('shared/')) {
    return { type: 'common', label: 'Common', variant: 'outline' };
  }

  if (
    path.includes('message.schema.json') ||
    path.includes('metadata.schema.json') ||
    path.includes('datamodelobjects.schema.json')
  ) {
    return { type: 'base', label: 'Base Schema', variant: 'destructive' };
  }

  // Default to unknown if no pattern matches
  return { type: 'unknown', label: 'Other', variant: 'secondary' };
}

// SortButton component defined outside to avoid recreation
type SortField = 'name' | 'title' | 'fileSize' | 'lastModified' | 'validationStatus' | 'type';

interface SortButtonProps {
  field: SortField;
  currentField: SortField;
  currentDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

const SortButton = ({
  field,
  currentField,
  currentDirection,
  onSort,
  children,
}: SortButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onSort(field)}
    className="h-auto p-0 font-medium hover:bg-transparent"
  >
    {children}
    <div className="ml-1 flex items-center">
      {currentField === field ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  </Button>
);

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
  const currentProject = useAppStore((state: any) => state.currentProject);
  const modalStack = useAppStore((state: any) => state.modalStack);
  const openSchemaModal = useAppStore((state: any) => state.openSchemaModal);
  const closeAllModals = useAppStore((state: any) => state.closeAllModals);
  const setPage = useAppStore((state: any) => state.setPage);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSchemaView = useCallback(
    (schema: Schema) => {
      openSchemaModal(schema, 'overview');
    },
    [openSchemaModal],
  );

  const handleSchemaEdit = useCallback(
    (_schema: Schema) => {
      // Navigate to Build page with schema editor
      setPage('build');
      // TODO: Set the schema to edit in the build page
    },
    [setPage],
  );

  // Get unique types and statuses for filter options
  const availableTypes = useMemo(() => {
    if (!currentProject?.schemas) return [];
    const typeMap = new Map<string, { type: string; label: string; variant: string }>();

    currentProject.schemas.forEach((schema: Schema) => {
      const typeInfo = getSchemaType(schema);

      // Store both type and label to avoid the mock schema issue
      typeMap.set(typeInfo.type, {
        type: typeInfo.type,
        label: typeInfo.label,
        variant: typeInfo.variant,
      });
    });

    return Array.from(typeMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [currentProject?.schemas]);

  const availableStatuses = useMemo(() => {
    if (!currentProject?.schemas) return [];
    const statuses = new Set<string>();
    currentProject.schemas.forEach((schema: Schema) => {
      statuses.add(schema.validationStatus);
    });
    return Array.from(statuses).sort();
  }, [currentProject?.schemas]);

  // Filter and sort schemas
  const filteredAndSortedSchemas = useMemo(() => {
    const schemas = currentProject?.schemas || [];

    // Helper function to recursively search through schema content
    const searchInSchemaContent = (obj: any, query: string): boolean => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(query.toLowerCase());
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some((value) => searchInSchemaContent(value, query));
      }
      return false;
    };

    // Filter schemas based on search query and filters
    let filtered = schemas;

    // Text search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((schema: Schema) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          schema.name.toLowerCase().includes(searchLower) ||
          (schema.metadata.title && schema.metadata.title.toLowerCase().includes(searchLower)) ||
          searchInSchemaContent(schema.content, searchQuery)
        );
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((schema: Schema) => {
        return getSchemaType(schema).type === typeFilter;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((schema: Schema) => {
        return schema.validationStatus === statusFilter;
      });
    }

    // Sort schemas
    filtered.sort((a: Schema, b: Schema) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'title':
          aValue = a.metadata.title || a.name;
          bValue = b.metadata.title || b.name;
          break;
        case 'fileSize':
          aValue = a.metadata.fileSize || 0;
          bValue = b.metadata.fileSize || 0;
          break;
        case 'lastModified':
          aValue = a.metadata.lastModified || 0;
          bValue = b.metadata.lastModified || 0;
          break;
        case 'validationStatus':
          aValue = a.validationStatus;
          bValue = b.validationStatus;
          break;
        case 'type':
          aValue = getSchemaType(a).type;
          bValue = getSchemaType(b).type;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [currentProject?.schemas, searchQuery, typeFilter, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalItems = filteredAndSortedSchemas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSchemas = filteredAndSortedSchemas.slice(startIndex, endIndex);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(parseInt(value));
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setCurrentPage(1);
    },
    [sortField, sortDirection],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No project loaded</h3>
          <p className="text-muted-foreground">Load a project to explore schemas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="glass-blue border-0 flex-1">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Search and Controls */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="w-64"
              />

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {availableTypes.map((typeInfo) => (
                    <SelectItem key={typeInfo.type} value={typeInfo.type}>
                      {typeInfo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="rounded-md border flex-1 flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortButton
                        field="title"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Schema
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="type"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Type
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="fileSize"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Size
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="lastModified"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Last Modified
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="validationStatus"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      >
                        Status
                      </SortButton>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSchemas.length > 0 ? (
                    paginatedSchemas.map((schema: Schema) => {
                      const schemaType = getSchemaType(schema);
                      return (
                        <TableRow
                          key={schema.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSchemaView(schema)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              {schema.metadata.title || schema.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={schemaType.variant} className="text-xs">
                              {schemaType.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {schema.metadata.fileSize} bytes
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {schema.metadata.lastModified
                              ? new Date(schema.metadata.lastModified).toLocaleDateString()
                              : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                schema.validationStatus === 'valid'
                                  ? 'default'
                                  : schema.validationStatus === 'invalid'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {schema.validationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover-lift"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleSchemaEdit(schema);
                                }}
                                title="Edit schema"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover-lift"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleSchemaView(schema);
                                }}
                                title="View schema details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                          ? 'No schemas match your filters.'
                          : 'No schemas found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination and Results info - Fixed at bottom */}
          <div className="flex items-center justify-between px-2 py-3 flex-shrink-0 border-t mt-3">
            <div className="text-muted-foreground text-sm">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} schema(s)
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schema Detail Modal */}
      {modalStack.length > 0 && (
        <SchemaDetailModal isOpen={true} onClose={closeAllModals} onEdit={handleSchemaEdit} />
      )}
    </div>
  );
}
