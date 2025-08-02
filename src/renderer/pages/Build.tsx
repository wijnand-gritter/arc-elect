/**
 * Build page component for JSON Schema Editor.
 *
 * This component provides comprehensive schema editing functionality including:
 * - Tree view navigation for schema organization
 * - Multi-tab editor interface
 * - Live validation and error reporting
 * - Schema preview and testing
 *
 * @module Build
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

import {
  Code,
  FileText,
  Folder,
  FolderOpen,
  X,
  Plus,
  Eye,
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Settings,
  CheckCircle,
  PlayCircle,
  BarChart3,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Minus,
  Save,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { Schema } from '../../types/schema-editor';
import { SchemaEditor } from '../components/editor/SchemaEditor';
import { ValidationError } from '../components/editor/MonacoEditor';
import { LivePreview } from '../components/preview/LivePreview';
import logger from '../lib/renderer-logger';
import { safeHandler } from '../lib/error-handling';
import { toast } from 'sonner';

/**
 * Interface for editor tabs.
 */
interface EditorTab {
  /** Unique tab identifier */
  id: string;
  /** Schema being edited */
  schema: Schema;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** Editor content (may differ from schema.content) */
  content: string;
  /** Validation errors for this tab */
  errors: ValidationError[];
}

/**
 * Interface for tree view items.
 */
interface TreeItem {
  /** Item identifier */
  id: string;
  /** Display name */
  name: string;
  /** Item type */
  type: 'folder' | 'schema';
  /** Parent item ID */
  parentId?: string;
  /** Child items */
  children: TreeItem[];
  /** Whether the folder is expanded */
  expanded?: boolean;
  /** Associated schema (if type is 'schema') */
  schema?: Schema;
  /** Full path for sorting and organization */
  path: string;
}

/**
 * Build page component for comprehensive schema editing.
 *
 * Features:
 * - Hierarchical tree view of schemas
 * - Multi-tab editor interface
 * - Live JSON validation
 * - Schema preview and testing
 * - File operations (save, revert, etc.)
 *
 * @returns JSX element representing the build page
 */
export function Build(): React.JSX.Element {
  const currentProject = useAppStore((state) => state.currentProject);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValidationErrors, setTabValidationErrors] = useState<Record<string, ValidationError[]>>(
    {},
  );

  // Build tree structure from schemas - file system approach
  const buildTreeStructure = useCallback((schemas: Schema[]): TreeItem[] => {
    const folderMap = new Map<string, TreeItem>();
    const rootItems: TreeItem[] = [];

    // Simple check for debugging
    const schemasWithFolders = schemas.filter((s) => s.relativePath.includes('/'));
    if (schemasWithFolders.length === 0) {
      logger.error('No folder paths found - all schemas appear to be at root level');
    }

    // First pass: Create all folders
    const allPaths = new Set<string>();
    schemas.forEach((schema) => {
      const pathParts = schema.relativePath.split('/').filter((part) => part.length > 0);

      // Add all parent folder paths
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderPath = pathParts.slice(0, i + 1).join('/');
        allPaths.add(folderPath);
      }
    });

    if (allPaths.size === 0) {
      logger.warn('No folder paths found - all schemas appear to be at root level');
    }

    // Create folder items
    Array.from(allPaths)
      .sort()
      .forEach((folderPath) => {
        const pathParts = folderPath.split('/');
        const folderName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');

        const folderItem: TreeItem = {
          id: folderPath,
          name: folderName,
          type: 'folder',
          path: folderPath,
          children: [],
          expanded: false, // Keep all folders collapsed initially
        };

        folderMap.set(folderPath, folderItem);

        // Add to parent or root
        if (parentPath && folderMap.has(parentPath)) {
          const parent = folderMap.get(parentPath)!;
          parent.children.push(folderItem);
          folderItem.parentId = parent.id;
        } else if (pathParts.length === 1) {
          rootItems.push(folderItem);
        }
      });

    // Second pass: Add schema files
    schemas.forEach((schema) => {
      const pathParts = schema.relativePath.split('/').filter((part) => part.length > 0);
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');

      const schemaItem: TreeItem = {
        id: schema.relativePath,
        name: fileName.replace('.schema.json', ''), // Clean display name
        type: 'schema',
        path: schema.relativePath,
        children: [],
        expanded: false,
        schema: schema,
      };

      // Add to parent folder or root
      if (parentPath && folderMap.has(parentPath)) {
        const parent = folderMap.get(parentPath)!;
        parent.children.push(schemaItem);
        schemaItem.parentId = parent.id;
      } else {
        // Root level schema file
        rootItems.push(schemaItem);
      }
    });

    // Sort function: folders first, then files, both alphabetically
    const sortItems = (items: TreeItem[]): TreeItem[] => {
      return items
        .sort((a, b) => {
          // Folders come before files
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          // Alphabetical within same type
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        })
        .map((item) => ({
          ...item,
          children: sortItems(item.children),
        }));
    };

    const sortedRootItems = sortItems(rootItems);

    logger.info('File system tree structure built', {
      rootItemCount: sortedRootItems.length,
      totalFolders: folderMap.size,
      totalSchemas: schemas.length,
      structure: sortedRootItems.map((item) => ({
        name: item.name,
        type: item.type,
        childCount: item.children.length,
        expanded: item.expanded,
      })),
    });

    return sortedRootItems;
  }, []);

  // Initialize tree structure when project changes
  React.useEffect(() => {
    if (currentProject?.schemas) {
      const tree = buildTreeStructure(currentProject.schemas);
      setTreeItems(tree);
      logger.info('Built tree structure', {
        projectName: currentProject.name,
        schemaCount: currentProject.schemas.length,
        treeNodes: tree.length,
      });
    } else {
      setTreeItems([]);
    }
  }, [currentProject?.schemas, buildTreeStructure]);

  // Open schema in new tab
  const openSchemaTab = useCallback(
    safeHandler((schema: Schema) => {
      const existingTab = editorTabs.find((tab) => tab.schema.id === schema.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      const newTab: EditorTab = {
        id: `tab-${schema.id}`,
        schema,
        isDirty: false,
        content: JSON.stringify(schema.content, null, 2),
        errors: [],
      };

      setEditorTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);

      logger.info('Opened schema in editor', {
        schemaName: schema.name,
        tabId: newTab.id,
      });

      // Removed toast notification as requested
    }),
    [editorTabs],
  );

  // Close editor tab
  const closeTab = useCallback(
    safeHandler(async (tabId: string) => {
      const tab = editorTabs.find((t) => t.id === tabId);
      if (tab?.isDirty) {
        setConfirmationDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: `Do you want to save changes to "${tab.schema.name}" before closing?`,
          action: async () => {
            // Save and close
            await handleSaveTab(tabId);
            closeTabWithoutConfirmation(tabId);
            setConfirmationDialog(null);
          },
          cancelAction: () => {
            // Close without saving
            closeTabWithoutConfirmation(tabId);
            setConfirmationDialog(null);
          },
        });
        return;
      }

      closeTabWithoutConfirmation(tabId);
    }),
    [editorTabs, activeTabId],
  );

  // Close tab without confirmation (internal use)
  const closeTabWithoutConfirmation = useCallback(
    safeHandler((tabId: string) => {
      setEditorTabs((prev) => prev.filter((t) => t.id !== tabId));
      setTabValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[tabId];
        return newErrors;
      });

      if (activeTabId === tabId) {
        const remainingTabs = editorTabs.filter((t) => t.id !== tabId);
        setActiveTabId(remainingTabs.length > 0 ? (remainingTabs[0]?.id ?? null) : null);
      }

      logger.info('Closed editor tab', { tabId });
    }),
    [editorTabs, activeTabId],
  );

  // Save specific tab
  const handleSaveTab = useCallback(
    safeHandler(async (tabId: string) => {
      const tab = editorTabs.find((t) => t.id === tabId);
      if (!tab || !window.api) {
        toast.error('Save failed', {
          description: 'Tab not found or file system API not available',
        });
        return;
      }

      try {
        // Validate JSON before saving
        try {
          JSON.parse(tab.content);
        } catch (_parseError) {
          toast.error('Cannot save invalid JSON', {
            description: 'Please fix JSON syntax errors first',
          });
          return;
        }

        // Save to file system
        const result = await window.api.writeFile(tab.schema.path, tab.content);

        if (result.success) {
          setEditorTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)));

          toast.success('Tab saved', {
            description: `${tab.schema.name} has been saved successfully`,
          });

          logger.info('Tab saved successfully', {
            schemaName: tab.schema.name,
            filePath: tab.schema.path,
            contentLength: tab.content.length,
          });
        } else {
          toast.error('Save failed', {
            description: result.error || 'Failed to save tab',
          });

          logger.error('Tab save failed', {
            schemaName: tab.schema.name,
            filePath: tab.schema.path,
            error: result.error,
          });
        }
      } catch (error) {
        toast.error('Save error', {
          description: 'An unexpected error occurred while saving',
        });

        logger.error('Tab save error', {
          schemaName: tab.schema.name,
          filePath: tab.schema.path,
          error: error instanceof Error ? error.message : error,
        });
      }
    }),
    [editorTabs],
  );

  // Format specific tab
  const handleFormatTab = useCallback(
    safeHandler(async (tabId: string) => {
      const tab = editorTabs.find((t) => t.id === tabId);
      if (!tab) return;

      try {
        const parsed = JSON.parse(tab.content);
        const formatted = JSON.stringify(parsed, null, 2);

        setEditorTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, content: formatted, isDirty: true } : t)),
        );

        toast.success('Tab formatted', {
          description: `${tab.schema.name} has been formatted`,
        });

        logger.info('Tab formatted', { schemaName: tab.schema.name });
      } catch (_error) {
        toast.error('Format failed', {
          description: 'Cannot format invalid JSON',
        });
      }
    }),
    [editorTabs],
  );

  // Context menu functions for tab operations
  const closeAllTabs = useCallback(
    safeHandler(async () => {
      const dirtyTabs = editorTabs.filter((tab) => tab.isDirty);
      if (dirtyTabs.length > 0) {
        setConfirmationDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: `You have ${dirtyTabs.length} tab(s) with unsaved changes. Do you want to save all changes before closing?`,
          action: () => {
            // Save all and close
            Promise.all(dirtyTabs.map((tab) => handleSaveTab(tab.id)))
              .then(() => {
                setEditorTabs([]);
                setActiveTabId(null);
                setTabValidationErrors({});
                setConfirmationDialog(null);
                toast.success('All tabs saved and closed');
              })
              .catch(() => {
                setConfirmationDialog(null);
              });
          },
          cancelAction: () => {
            // Close without saving
            setEditorTabs([]);
            setActiveTabId(null);
            setTabValidationErrors({});
            setConfirmationDialog(null);
            toast.success('All tabs closed');
          },
        });
        return;
      }

      setEditorTabs([]);
      setActiveTabId(null);
      setTabValidationErrors({});
      logger.info('Closed all tabs');
      toast.success('All tabs closed');
    }),
    [editorTabs],
  );

  const closeOtherTabs = useCallback(
    safeHandler(async (tabId: string) => {
      const targetTab = editorTabs.find((t) => t.id === tabId);
      const otherTabs = editorTabs.filter((t) => t.id !== tabId);
      const dirtyOtherTabs = otherTabs.filter((tab) => tab.isDirty);

      if (dirtyOtherTabs.length > 0) {
        setConfirmationDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: `You have ${dirtyOtherTabs.length} tab(s) with unsaved changes. Do you want to save all changes before closing?`,
          action: () => {
            // Save all and close others
            Promise.all(dirtyOtherTabs.map((tab) => handleSaveTab(tab.id)))
              .then(() => {
                setEditorTabs([targetTab!]);
                setActiveTabId(tabId);
                setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
                setConfirmationDialog(null);
                toast.success('Other tabs saved and closed');
              })
              .catch(() => {
                setConfirmationDialog(null);
              });
          },
          cancelAction: () => {
            // Close without saving
            setEditorTabs([targetTab!]);
            setActiveTabId(tabId);
            setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
            setConfirmationDialog(null);
            toast.success('Other tabs closed');
          },
        });
        return;
      }

      setEditorTabs([targetTab!]);
      setActiveTabId(tabId);
      setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });

      logger.info('Closed other tabs', { remainingTab: tabId });
      toast.success('Other tabs closed');
    }),
    [editorTabs, tabValidationErrors],
  );

  const closeTabsToLeft = useCallback(
    safeHandler(async (tabId: string) => {
      const targetIndex = editorTabs.findIndex((t) => t.id === tabId);
      const tabsToClose = editorTabs.slice(0, targetIndex);
      const dirtyTabsToClose = tabsToClose.filter((tab) => tab.isDirty);

      if (dirtyTabsToClose.length > 0) {
        setConfirmationDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: `You have ${dirtyTabsToClose.length} tab(s) with unsaved changes. Do you want to save all changes before closing?`,
          action: () => {
            // Save all and close
            Promise.all(dirtyTabsToClose.map((tab) => handleSaveTab(tab.id)))
              .then(() => {
                const remainingTabs = editorTabs.slice(targetIndex);
                setEditorTabs(remainingTabs);
                setActiveTabId(tabId);
                setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
                setConfirmationDialog(null);
                toast.success(`Saved and closed ${tabsToClose.length} tab(s) to the left`);
              })
              .catch(() => {
                setConfirmationDialog(null);
              });
          },
          cancelAction: () => {
            // Close without saving
            const remainingTabs = editorTabs.slice(targetIndex);
            setEditorTabs(remainingTabs);
            setActiveTabId(tabId);
            setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
            setConfirmationDialog(null);
            toast.success(`Closed ${tabsToClose.length} tab(s) to the left`);
          },
        });
        return;
      }

      const remainingTabs = editorTabs.slice(targetIndex);
      setEditorTabs(remainingTabs);
      setActiveTabId(tabId);
      setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });

      logger.info('Closed tabs to left', { remainingTabs: remainingTabs.length });
      toast.success(`Closed ${tabsToClose.length} tab(s) to the left`);
    }),
    [editorTabs, tabValidationErrors],
  );

  const closeTabsToRight = useCallback(
    safeHandler(async (tabId: string) => {
      const targetIndex = editorTabs.findIndex((t) => t.id === tabId);
      const tabsToClose = editorTabs.slice(targetIndex + 1);
      const dirtyTabsToClose = tabsToClose.filter((tab) => tab.isDirty);

      if (dirtyTabsToClose.length > 0) {
        setConfirmationDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: `You have ${dirtyTabsToClose.length} tab(s) with unsaved changes. Do you want to save all changes before closing?`,
          action: () => {
            // Save all and close
            Promise.all(dirtyTabsToClose.map((tab) => handleSaveTab(tab.id)))
              .then(() => {
                const remainingTabs = editorTabs.slice(0, targetIndex + 1);
                setEditorTabs(remainingTabs);
                setActiveTabId(tabId);
                setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
                setConfirmationDialog(null);
                toast.success(`Saved and closed ${tabsToClose.length} tab(s) to the right`);
              })
              .catch(() => {
                setConfirmationDialog(null);
              });
          },
          cancelAction: () => {
            // Close without saving
            const remainingTabs = editorTabs.slice(0, targetIndex + 1);
            setEditorTabs(remainingTabs);
            setActiveTabId(tabId);
            setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });
            setConfirmationDialog(null);
            toast.success(`Closed ${tabsToClose.length} tab(s) to the right`);
          },
        });
        return;
      }

      const remainingTabs = editorTabs.slice(0, targetIndex + 1);
      setEditorTabs(remainingTabs);
      setActiveTabId(tabId);
      setTabValidationErrors({ [tabId]: tabValidationErrors[tabId] || [] });

      logger.info('Closed tabs to right', { remainingTabs: remainingTabs.length });
      toast.success(`Closed ${tabsToClose.length} tab(s) to the right`);
    }),
    [editorTabs, tabValidationErrors],
  );

  // Toggle tree item expansion
  const toggleTreeItem = useCallback((itemId: string) => {
    const toggleItem = (items: TreeItem[]): TreeItem[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children.length > 0) {
          return { ...item, children: toggleItem(item.children) };
        }
        return item;
      });
    };

    setTreeItems((prev) => toggleItem(prev));
  }, []);

  // Filter tree items based on search
  const filteredTreeItems = useMemo(() => {
    if (!searchQuery.trim()) return treeItems;

    const filterItems = (items: TreeItem[]): TreeItem[] => {
      return items
        .map((item) => {
          const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
          const filteredChildren = filterItems(item.children);

          if (matchesSearch || filteredChildren.length > 0) {
            return {
              ...item,
              children: filteredChildren,
              expanded: true, // Auto-expand when filtering
            };
          }
          return null;
        })
        .filter(Boolean) as TreeItem[];
    };

    return filterItems(treeItems);
  }, [treeItems, searchQuery]);

  // Handle tab content changes
  const handleTabContentChange = useCallback(
    safeHandler((tabId: string, newContent: string) => {
      setEditorTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, content: newContent } : tab)),
      );
    }),
    [],
  );

  // Handle tab dirty state changes
  const handleTabDirtyChange = useCallback(
    safeHandler((tabId: string, isDirty: boolean) => {
      setEditorTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, isDirty } : tab)));
    }),
    [],
  );

  // Handle tab validation changes
  const handleTabValidationChange = useCallback(
    safeHandler((tabId: string, errors: ValidationError[]) => {
      setTabValidationErrors((prev) => ({ ...prev, [tabId]: errors }));
      setEditorTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, errors } : tab)));
    }),
    [],
  );

  // Handle ref click to open referenced schema
  const handleRefClick = useCallback(
    safeHandler((refPath: string) => {
      logger.info('Ref click attempted', {
        refPath,
        availableSchemas: currentProject?.schemas?.map((s) => ({ name: s.name, path: s.path })),
      });

      // Find the schema by path or name with multiple matching strategies
      const targetSchema = currentProject?.schemas?.find((schema) => {
        // Exact path match
        if (schema.path === refPath) return true;
        // Exact name match
        if (schema.name === refPath) return true;
        // Path ends with the ref path
        if (schema.path.endsWith(refPath)) return true;
        // Path includes the ref path
        if (schema.path.includes(refPath)) return true;
        // Name includes the ref path
        if (schema.name.includes(refPath)) return true;
        // Handle relative paths by checking if the schema path ends with the ref path
        if (refPath.startsWith('./') && schema.path.endsWith(refPath.substring(2))) return true;
        if (refPath.startsWith('../') && schema.path.endsWith(refPath.substring(3))) return true;

        return false;
      });

      if (targetSchema) {
        openSchemaTab(targetSchema);
        logger.info('Navigated to ref successfully', {
          refPath,
          targetSchema: targetSchema.name,
          targetPath: targetSchema.path,
        });
      } else {
        // Log all available schemas for debugging
        logger.warn('Ref navigation failed - schema not found', {
          refPath,
          availableSchemas: currentProject?.schemas?.map((s) => ({ name: s.name, path: s.path })),
        });
        toast.error('Schema not found', {
          description: `Could not find schema: ${refPath}`,
        });
      }
    }),
    [currentProject?.schemas, openSchemaTab],
  );

  // Get active tab
  const activeTab = editorTabs.find((tab) => tab.id === activeTabId);

  // Tab scrolling state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isBatchValidating, setIsBatchValidating] = useState(false);
  const [batchValidationResults, setBatchValidationResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    errors: { schemaId: string; schemaName: string; errors: ValidationError[] }[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    cancelAction?: () => void;
  } | null>(null);

  // Update scroll button visibility
  const updateScrollButtons = useCallback(() => {
    const tabContainer = document.getElementById('tab-container');
    if (!tabContainer) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = tabContainer;
    const hasHorizontalScroll = scrollWidth > clientWidth;

    // Always show scroll buttons if there are many tabs, even if scroll detection is delayed
    const hasManyTabs = editorTabs.length > 5;

    setCanScrollLeft(hasHorizontalScroll && scrollLeft > 0);
    setCanScrollRight(hasHorizontalScroll && scrollLeft < scrollWidth - clientWidth - 1);

    // Force scroll buttons to show if there are many tabs and we're at the edges
    if (hasManyTabs) {
      if (scrollLeft <= 0) {
        setCanScrollLeft(false);
      }
      if (scrollLeft >= scrollWidth - clientWidth - 1) {
        setCanScrollRight(false);
      }
    }
  }, [editorTabs.length]);

  // Update scroll buttons when tabs change or component mounts
  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 100); // Small delay to ensure DOM is updated
    return () => clearTimeout(timer);
  }, [editorTabs.length, updateScrollButtons]);

  // Force update scroll buttons when tabs are added/removed
  useEffect(() => {
    if (editorTabs.length > 0) {
      const timer = setTimeout(updateScrollButtons, 200);
      return () => clearTimeout(timer);
    }
  }, [editorTabs.length, updateScrollButtons]);

  // Add resize observer to update scroll buttons when container size changes
  useEffect(() => {
    const tabContainer = document.getElementById('tab-container');
    if (!tabContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateScrollButtons, 50);
    });
    resizeObserver.observe(tabContainer);

    return () => resizeObserver.disconnect();
  }, [updateScrollButtons]);

  // Scroll tabs left or right
  const scrollTabs = useCallback(
    (direction: 'left' | 'right') => {
      const container = document.getElementById('tab-container');
      if (container) {
        const scrollAmount = Math.min(200, container.clientWidth * 0.8);
        container.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
        setTimeout(updateScrollButtons, 300);
      }
    },
    [updateScrollButtons],
  );

  // Batch validation
  const runBatchValidation = useCallback(
    safeHandler(async () => {
      if (!currentProject?.schemas?.length) {
        toast.error('No schemas to validate');
        return;
      }

      setIsBatchValidating(true);
      setBatchValidationResults(null);

      try {
        const results = {
          total: currentProject.schemas.length,
          valid: 0,
          invalid: 0,
          errors: [] as Array<{
            schemaId: string;
            schemaName: string;
            errors: ValidationError[];
          }>,
        };

        for (const schema of currentProject.schemas) {
          try {
            const fileResult = await window.api.readFile(schema.path);
            if (!fileResult.success || !fileResult.data) {
              results.invalid++;
              results.errors.push({
                schemaId: schema.id,
                schemaName: schema.name,
                errors: [
                  {
                    line: 1,
                    column: 1,
                    message: `Failed to read schema file: ${fileResult.error || 'Unknown error'}`,
                    severity: 'error',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                ],
              });
              continue;
            }

            // Validate JSON syntax
            try {
              JSON.parse(fileResult.data);
              results.valid++;
            } catch (parseError) {
              results.invalid++;
              results.errors.push({
                schemaId: schema.id,
                schemaName: schema.name,
                errors: [
                  {
                    line: 1,
                    column: 1,
                    message: `JSON Parse Error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
                    severity: 'error',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                ],
              });
            }
          } catch (error) {
            results.invalid++;
            results.errors.push({
              schemaId: schema.id,
              schemaName: schema.name,
              errors: [
                {
                  line: 1,
                  column: 1,
                  message: `Validation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  severity: 'error',
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: 1,
                  endColumn: 1,
                },
              ],
            });
          }
        }

        setBatchValidationResults(results);

        if (results.invalid === 0) {
          toast.success(`Batch validation complete: All ${results.total} schemas are valid!`);
        } else {
          toast.warning(
            `Batch validation complete: ${results.valid} valid, ${results.invalid} invalid schemas`,
          );
        }

        logger.info('Batch validation completed', results);
      } catch (error) {
        logger.error('Batch validation failed', { error });
        toast.error('Batch validation failed');
      } finally {
        setIsBatchValidating(false);
      }
    }),
    [currentProject?.schemas],
  );

  // Update scroll buttons when tabs change or component mounts
  useEffect(() => {
    updateScrollButtons();
    const tabContainer = document.getElementById('tab-container');
    if (tabContainer) {
      tabContainer.addEventListener('scroll', updateScrollButtons);
      return () => tabContainer.removeEventListener('scroll', updateScrollButtons);
    }
  }, [editorTabs, updateScrollButtons]);

  // Save all tabs
  const handleSaveAll = useCallback(
    safeHandler(async () => {
      const dirtyTabs = editorTabs.filter((tab) => tab.isDirty);
      if (dirtyTabs.length === 0) {
        toast.info('No files to save');
        return;
      }

      setIsSaving(true);

      try {
        const savePromises = dirtyTabs.map(async (tab) => {
          try {
            // Validate JSON before saving
            JSON.parse(tab.content);

            // Save to file system
            const result = await window.api.writeFile(tab.schema.path, tab.content);

            if (result.success) {
              setEditorTabs((prev) =>
                prev.map((t) => (t.id === tab.id ? { ...t, isDirty: false } : t)),
              );

              logger.info('Tab saved successfully', {
                schemaName: tab.schema.name,
                filePath: tab.schema.path,
              });

              return { success: true, tabName: tab.schema.name };
            } else {
              logger.error('Tab save failed', {
                schemaName: tab.schema.name,
                filePath: tab.schema.path,
                error: result.error,
              });

              return { success: false, tabName: tab.schema.name, error: result.error };
            }
          } catch (parseError) {
            logger.error('Tab save failed - invalid JSON', {
              schemaName: tab.schema.name,
              error: parseError instanceof Error ? parseError.message : parseError,
            });

            return { success: false, tabName: tab.schema.name, error: 'Invalid JSON' };
          }
        });

        const results = await Promise.all(savePromises);
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (successful.length > 0) {
          toast.success(`Saved ${successful.length} file(s)`, {
            description: successful.map((r) => r.tabName).join(', '),
          });
        }

        if (failed.length > 0) {
          toast.error(`Failed to save ${failed.length} file(s)`, {
            description: failed.map((r) => `${r.tabName}: ${r.error}`).join(', '),
          });
        }

        logger.info('Save all completed', {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        });
      } catch (error) {
        toast.error('Save all failed', {
          description: 'An unexpected error occurred',
        });

        logger.error('Save all error', {
          error: error instanceof Error ? error.message : error,
        });
      } finally {
        setIsSaving(false);
      }
    }),
    [editorTabs],
  );

  // Render tree item
  const renderTreeItem = (item: TreeItem, depth = 0) => {
    const Icon = item.type === 'folder' ? (item.expanded ? FolderOpen : Folder) : FileText;
    const hasChildren = item.children.length > 0;
    const indentStyle = { paddingLeft: `${depth * 16 + 8}px` };

    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-accent/50 cursor-pointer rounded-sm"
          style={indentStyle}
          onClick={() => {
            if (item.type === 'folder') {
              toggleTreeItem(item.id);
            } else if (item.schema) {
              openSchemaTab(item.schema);
            }
          }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleTreeItem(item.id);
              }}
            >
              {item.expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="h-4 w-4 shrink-0" /> // Spacer for alignment
          )}
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{item.name}</span>
          {item.schema && (
            <Badge
              variant={item.schema.validationStatus === 'valid' ? 'default' : 'destructive'}
              className="ml-auto h-4 text-xs"
            >
              {item.schema.validationStatus}
            </Badge>
          )}
        </div>
        {item.expanded && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  // No project state
  if (!currentProject) {
    return (
      <div className="h-full flex flex-col">
        <Card className="glass-blue border-0 flex-1">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Code className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">No Project Loaded</h3>
                  <p className="text-sm text-muted-foreground">
                    Please load a project to start editing schemas
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
    <div className="h-full flex flex-col">
      {/* Header - no card wrapper */}
      <div className="bg-muted/20 border-b border-border/50 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {currentProject.name} ({currentProject.schemas?.length || 0} schemas)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runBatchValidation}
              disabled={isBatchValidating || !currentProject.schemas?.length}
            >
              {isBatchValidating ? (
                <PlayCircle className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isBatchValidating ? 'Validating...' : 'Batch Validate'}
            </Button>
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size="sm"
              disabled={!activeTab}
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            {batchValidationResults && (
              <Button variant="outline" size="sm" onClick={() => setBatchValidationResults(null)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Results ({batchValidationResults.valid}/{batchValidationResults.total})
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {editorTabs.length} tab{editorTabs.length !== 1 ? 's' : ''} open
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - no card wrappers */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">
        {/* Tree View Sidebar */}
        <div className="col-span-3 bg-muted/10 border-r border-border/50 flex flex-col">
          <div className="p-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Schema Explorer</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full px-3">
              {filteredTreeItems.length > 0 ? (
                <div className="space-y-1">
                  {filteredTreeItems.map((item) => renderTreeItem(item))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No schemas match your search' : 'No schemas found'}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Editor Area */}
        <div className="col-span-9 flex flex-col">
          {editorTabs.length > 0 ? (
            <Tabs
              value={activeTabId || ''}
              onValueChange={setActiveTabId}
              className="flex flex-col h-full"
            >
              {/* Tab Headers */}
              <div className="border-b border-border/50 flex-shrink-0">
                <TabsList className="h-auto p-0 bg-transparent">
                  <div className="flex items-center w-full">
                    {/* Left scroll arrow */}
                    {(canScrollLeft || editorTabs.length > 5) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 border-r border-border/50"
                        onClick={() => scrollTabs('left')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Scrollable tab container with context menu */}
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div
                          id="tab-container"
                          className="flex-1 overflow-x-auto scrollbar-hide"
                          style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            maxWidth: 'calc(100vw - 400px)', // Ensure it doesn't exceed viewport
                          }}
                          onScroll={updateScrollButtons}
                        >
                          <div className="flex min-w-max">
                            {editorTabs.map((tab) => (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="relative flex items-center gap-2 px-4 py-3 data-[state=active]:bg-accent/50 whitespace-nowrap shrink-0"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="text-sm">{tab.schema.name}</span>
                                {tab.isDirty && (
                                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                )}
                                {tab.errors.length > 0 && (
                                  <AlertTriangle className="w-3 h-3 text-destructive" />
                                )}
                                <div
                                  className="h-4 w-4 ml-2 flex items-center justify-center rounded-sm hover:bg-destructive/20 cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </div>
                              </TabsTrigger>
                            ))}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
                        <ContextMenuItem onClick={() => activeTabId && handleSaveTab(activeTabId)}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Tab
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => activeTabId && handleFormatTab(activeTabId)}
                        >
                          <Code className="w-4 h-4 mr-2" />
                          Format Tab
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => activeTabId && closeTab(activeTabId)}>
                          <X className="w-4 h-4 mr-2" />
                          Close Tab
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => closeAllTabs()}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Close All Tabs
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => activeTabId && closeTabsToLeft(activeTabId)}
                          disabled={
                            !activeTabId || editorTabs.findIndex((t) => t.id === activeTabId) === 0
                          }
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Close Tabs to Left
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => activeTabId && closeTabsToRight(activeTabId)}
                          disabled={
                            !activeTabId ||
                            editorTabs.findIndex((t) => t.id === activeTabId) ===
                              editorTabs.length - 1
                          }
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Close Tabs to Right
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => activeTabId && closeOtherTabs(activeTabId)}
                          disabled={!activeTabId || editorTabs.length <= 1}
                        >
                          <Minus className="w-4 h-4 mr-2" />
                          Close Other Tabs
                        </ContextMenuItem>
                        <ContextMenuItem onClick={handleSaveAll} disabled={isSaving}>
                          <Save className="w-4 h-4 mr-2" />
                          Save All Tabs
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>

                    {/* Right scroll arrow */}
                    {(canScrollRight || editorTabs.length > 5) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 border-l border-border/50"
                        onClick={() => scrollTabs('right')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TabsList>
              </div>

              {/* Tab Content */}
              {editorTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0 flex-1 min-h-0">
                  <div className="h-full flex flex-col">
                    <div className={`flex-1 ${showPreview ? 'grid grid-cols-2 gap-4' : ''}`}>
                      {/* Monaco Editor */}
                      <div className="flex flex-col h-full">
                        <SchemaEditor
                          schema={tab.schema}
                          content={tab.content}
                          isDirty={tab.isDirty}
                          onContentChange={(content) => handleTabContentChange(tab.id, content)}
                          onDirtyChange={(isDirty) => handleTabDirtyChange(tab.id, isDirty)}
                          onValidationChange={(errors) => handleTabValidationChange(tab.id, errors)}
                          errors={tabValidationErrors[tab.id] || []}
                          availableSchemas={
                            currentProject?.schemas?.map((schema) => ({
                              id: schema.id,
                              name: schema.name,
                              path: schema.path,
                            })) || []
                          }
                          onRefClick={handleRefClick}
                          onSaveAll={handleSaveAll}
                          isSaving={isSaving}
                        />
                      </div>

                      {/* Live Preview */}
                      {showPreview && (
                        <div className="flex flex-col h-full">
                          <LivePreview
                            schemaContent={tab.content}
                            schemaName={tab.schema.name}
                            isValid={tab.errors.length === 0}
                            errors={tab.errors.map((error) => ({
                              message: error.message,
                              line: error.line,
                              column: error.column,
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center space-y-4">
                <Code className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">No Schemas Open</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a schema from the explorer to start editing
                  </p>
                </div>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Schema
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmationDialog && (
        <Dialog
          open={confirmationDialog.isOpen}
          onOpenChange={(open) => !open && setConfirmationDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmationDialog.title}</DialogTitle>
              <DialogDescription>{confirmationDialog.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={confirmationDialog.cancelAction || (() => setConfirmationDialog(null))}
              >
                Close
              </Button>
              <Button onClick={confirmationDialog.action}>Save & Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
