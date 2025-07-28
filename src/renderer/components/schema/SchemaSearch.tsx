/**
 * Schema search component for JSON Schema Editor.
 *
 * This component provides advanced search and filtering capabilities
 * for schemas with real-time search, saved searches, and filter presets.
 *
 * @module SchemaSearch
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Search, Filter, X, Save, Clock, Trash2, Bookmark } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { toast } from 'sonner';
import type { ValidationStatus } from '../../../types/schema-editor';

/**
 * Schema search component props.
 */
interface SchemaSearchProps {
  /** Whether the search panel is expanded */
  isExpanded?: boolean;
  /** Function called when search panel is toggled */
  onToggleExpanded?: () => void;
}

/**
 * Schema search component for advanced filtering and search.
 *
 * This component provides:
 * - Real-time text search
 * - Validation status filtering
 * - File size range filtering
 * - Date range filtering
 * - Saved searches management
 * - Search history
 *
 * @param props - Component props
 * @returns JSX element representing the schema search component
 *
 * @example
 * ```tsx
 * <SchemaSearch
 *   isExpanded={true}
 *   onToggleExpanded={() => {}}
 * />
 * ```
 */
export function SchemaSearch({
  isExpanded = false,
  onToggleExpanded,
}: SchemaSearchProps): React.JSX.Element {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const searchFilters = useAppStore((state) => state.searchFilters);
  const savedSearches = useAppStore((state) => state.savedSearches);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setSearchFilters = useAppStore((state) => state.setSearchFilters);
  const saveSearch = useAppStore((state) => state.saveSearch);
  const loadSavedSearch = useAppStore((state) => state.loadSavedSearch);
  const deleteSavedSearch = useAppStore((state) => state.deleteSavedSearch);

  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  /**
   * Handles text search input changes.
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery],
  );

  /**
   * Handles validation status filter changes.
   */
  const handleValidationStatusChange = useCallback(
    (value: string) => {
      setSearchFilters({ validationStatus: value as ValidationStatus | 'all' });
    },
    [setSearchFilters],
  );

  /**
   * Handles sort field changes.
   */
  const handleSortByChange = useCallback(
    (value: string) => {
      setSearchFilters({ sortBy: value as any });
    },
    [setSearchFilters],
  );

  /**
   * Handles sort direction changes.
   */
  const handleSortDirectionChange = useCallback(
    (value: string) => {
      setSearchFilters({ sortDirection: value as 'asc' | 'desc' });
    },
    [setSearchFilters],
  );

  /**
   * Handles saving the current search.
   */
  const handleSaveSearch = useCallback(() => {
    if (!saveSearchName.trim()) {
      toast.error('Please enter a name for the saved search');
      return;
    }

    saveSearch(saveSearchName.trim());
    setSaveSearchName('');
    setShowSavedSearches(false);
    toast.success('Search saved successfully');
  }, [saveSearchName, saveSearch]);

  /**
   * Handles loading a saved search.
   */
  const handleLoadSavedSearch = useCallback(
    (searchId: string) => {
      loadSavedSearch(searchId);
      toast.success('Saved search loaded');
    },
    [loadSavedSearch],
  );

  /**
   * Handles deleting a saved search.
   */
  const handleDeleteSavedSearch = useCallback(
    (searchId: string) => {
      deleteSavedSearch(searchId);
      toast.success('Saved search deleted');
    },
    [deleteSavedSearch],
  );

  /**
   * Clears all search filters.
   */
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSearchFilters({
      search: '',
      validationStatus: 'all',
      fileSize: { min: undefined, max: undefined },
      dateRange: { start: undefined, end: undefined },
      sortBy: 'name',
      sortDirection: 'asc',
    });
    toast.success('Search filters cleared');
  }, [setSearchQuery, setSearchFilters]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search schemas by name, content, or description..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleExpanded}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
        {(searchQuery || searchFilters.validationStatus !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>Refine your search with specific criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Validation Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Validation Status</label>
                <Select
                  value={searchFilters.validationStatus}
                  onValueChange={handleValidationStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="invalid">Invalid</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={searchFilters.sortBy} onValueChange={handleSortByChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="lastModified">Last Modified</SelectItem>
                    <SelectItem value="fileSize">File Size</SelectItem>
                    <SelectItem value="validationStatus">Validation Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Direction */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Direction</label>
                <Select
                  value={searchFilters.sortDirection}
                  onValueChange={handleSortDirectionChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Saved Searches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Saved Searches</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSavedSearches(!showSavedSearches)}
                  className="flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  {showSavedSearches ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showSavedSearches && (
                <div className="space-y-2">
                  {/* Save Current Search */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter search name..."
                      value={saveSearchName}
                      onChange={(e) => setSaveSearchName(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleSaveSearch}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Saved Searches List */}
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {savedSearches.map((search) => (
                        <div
                          key={search.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{search.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {search.query || 'No query'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadSavedSearch(search.id)}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSavedSearch(search.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {savedSearches.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No saved searches
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
