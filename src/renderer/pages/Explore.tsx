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
  const [sortField, setSortField] = useState<
    'name' | 'title' | 'fileSize' | 'lastModified' | 'validationStatus'
  >('name');
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

  // Filter and sort schemas
  const filteredAndSortedSchemas = useMemo(() => {
    const schemas = currentProject?.schemas || [];

    // Helper function to recursively search through schema content
    const searchInSchemaContent = (obj: any, query: string): boolean => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(query);
      }
      if (typeof obj === 'number') {
        return obj.toString().toLowerCase().includes(query);
      }
      if (Array.isArray(obj)) {
        return obj.some((item) => searchInSchemaContent(item, query));
      }
      if (obj && typeof obj === 'object') {
        return Object.entries(obj).some(([key, value]) => {
          // Search in property names
          if (key.toLowerCase().includes(query)) {
            return true;
          }
          // Search in property values
          return searchInSchemaContent(value, query);
        });
      }
      return false;
    };

    // Filter schemas based on search query
    const filtered = schemas.filter((schema: Schema) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const name = schema.name.toLowerCase();
      const title = schema.metadata.title?.toLowerCase() || '';
      const description = schema.metadata.description?.toLowerCase() || '';

      // Search in basic metadata
      if (name.includes(query) || title.includes(query) || description.includes(query)) {
        return true;
      }

      // Search in schema content (properties, definitions, etc.)
      if (schema.content && searchInSchemaContent(schema.content, query)) {
        return true;
      }

      return false;
    });

    // Sort schemas
    const sorted = [...filtered].sort((a: Schema, b: Schema) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

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
          aValue = a.metadata.fileSize;
          bValue = b.metadata.fileSize;
          break;
        case 'lastModified':
          aValue = a.metadata.lastModified || new Date(0);
          bValue = b.metadata.lastModified || new Date(0);
          break;
        case 'validationStatus':
          aValue = a.validationStatus;
          bValue = b.validationStatus;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [currentProject?.schemas, searchQuery, sortField, sortDirection]);

  // Pagination logic
  const totalItems = filteredAndSortedSchemas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSchemas = filteredAndSortedSchemas.slice(startIndex, endIndex);

  // Reset to first page when search or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  const handleSort = useCallback(
    (field: typeof sortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField, sortDirection],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages],
  );

  const handlePageSizeChange = useCallback((newPageSize: string) => {
    const size = parseInt(newPageSize, 10);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const SortButton = ({
    field,
    children,
  }: {
    field: typeof sortField;
    children: React.ReactNode;
  }) => (
    <Button variant="ghost" onClick={() => handleSort(field)} className="h-8 px-2">
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="h-full flex flex-col">
      <Card className="glass-blue border-0 flex-1 flex flex-col">
        <CardContent className="p-3 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col h-full">
            {/* Search and filters */}
            <div className="flex items-center justify-between py-2 flex-shrink-0">
              <Input
                placeholder="Search schemas by name, title, description, or properties..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="max-w-sm"
              />
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
                        <SortButton field="title">Schema</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="name">Path</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="fileSize">Size</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="lastModified">Last Modified</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="validationStatus">Status</SortButton>
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSchemas.length > 0 ? (
                      paginatedSchemas.map((schema: Schema) => (
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
                          <TableCell className="text-muted-foreground text-sm">
                            {schema.name}
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {searchQuery ? 'No schemas match your search.' : 'No schemas found.'}
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
