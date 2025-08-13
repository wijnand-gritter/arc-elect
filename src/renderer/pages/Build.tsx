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
import { safeAsyncHandler, safeHandler } from '../lib/error-handling';

import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  CheckCircle,
  PlayCircle,
  BarChart3,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Minus,
  Save,
  Trash2,
  ExternalLink,
  Copy,
  Edit,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { Schema } from '../../types/schema-editor';
import { SchemaEditor } from '../components/editor/SchemaEditor';
import { ValidationError } from '../components/editor/MonacoEditor';
import logger from '../lib/renderer-logger';
import { toast } from 'sonner';
import { formatSchemaJsonString } from '../lib/json-format';

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
  const [tabValidationErrors, setTabValidationErrors] = useState<
    Record<string, ValidationError[]>
  >({});
  const [contextMenuItem, setContextMenuItem] = useState<TreeItem | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateSchemaDialogOpen, setIsCreateSchemaDialogOpen] =
    useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateRootSchemaDialogOpen, setIsCreateRootSchemaDialogOpen] =
    useState(false);
  const [isCreateRootFolderDialogOpen, setIsCreateRootFolderDialogOpen] =
    useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] =
    useState(false);
  const [rootSchemaName, setRootSchemaName] = useState('');
  const [rootFolderName, setRootFolderName] = useState('');
  const [templateSchemaName, setTemplateSchemaName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('simple-object');

  // Build tree structure from schemas - file system approach
  const buildTreeStructure = useCallback((schemas: Schema[]): TreeItem[] => {
    const folderMap = new Map<string, TreeItem>();
    const rootItems: TreeItem[] = [];

    // Simple check for debugging
    const schemasWithFolders = schemas.filter((s) =>
      s.relativePath.includes('/'),
    );
    if (schemasWithFolders.length === 0) {
      logger.error(
        'No folder paths found - all schemas appear to be at root level',
      );
    }

    // First pass: Create all folders
    const allPaths = new Set<string>();
    schemas.forEach((schema) => {
      const pathParts = schema.relativePath
        .split('/')
        .filter((part) => part.length > 0);

      // Add all parent folder paths
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderPath = pathParts.slice(0, i + 1).join('/');
        allPaths.add(folderPath);
      }
    });

    if (allPaths.size === 0) {
      logger.warn(
        'No folder paths found - all schemas appear to be at root level',
      );
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
      const pathParts = schema.relativePath
        .split('/')
        .filter((part) => part.length > 0);
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
          return a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
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
        setActiveTabId(
          remainingTabs.length > 0 ? (remainingTabs[0]?.id ?? null) : null,
        );
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
        // Ask the active editor instance (if any) to format before save
        // The actual active SchemaEditor handles format-before-save itself, but
        // if this path is used via context menu we still attempt to normalize content
        try {
          const formatted = JSON.stringify(JSON.parse(tab.content), null, 2);
          if (formatted !== tab.content) {
            setEditorTabs((prev) =>
              prev.map((t) =>
                t.id === tabId ? { ...t, content: formatted } : t,
              ),
            );
          }
        } catch (_e) {
          // ignore formatting attempt here; validation will catch errors
        }

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
          setEditorTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
          );

          // Update in-memory project schema so future opens use latest content
          try {
            const parsed = JSON.parse(tab.content);
            useAppStore.setState((state) => ({
              currentProject: state.currentProject
                ? {
                    ...state.currentProject,
                    schemas: state.currentProject.schemas.map((s) =>
                      s.id === tab.schema.id
                        ? {
                            ...s,
                            content: parsed,
                            metadata: s.metadata
                              ? {
                                  ...s.metadata,
                                  lastModified: new Date(),
                                  fileSize: tab.content.length,
                                }
                              : s.metadata,
                          }
                        : s,
                    ),
                  }
                : null,
            }));
            logger.info('Updated store schema content after save', {
              schemaName: tab.schema.name,
              filePath: tab.schema.path,
            });
          } catch (_e) {
            // ignore
          }

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
          prev.map((t) =>
            t.id === tabId ? { ...t, content: formatted, isDirty: true } : t,
          ),
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
                setTabValidationErrors({
                  [tabId]: tabValidationErrors[tabId] || [],
                });
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
            setTabValidationErrors({
              [tabId]: tabValidationErrors[tabId] || [],
            });
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
                setTabValidationErrors({
                  [tabId]: tabValidationErrors[tabId] || [],
                });
                setConfirmationDialog(null);
                toast.success(
                  `Saved and closed ${tabsToClose.length} tab(s) to the left`,
                );
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
            setTabValidationErrors({
              [tabId]: tabValidationErrors[tabId] || [],
            });
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

      logger.info('Closed tabs to left', {
        remainingTabs: remainingTabs.length,
      });
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
                setTabValidationErrors({
                  [tabId]: tabValidationErrors[tabId] || [],
                });
                setConfirmationDialog(null);
                toast.success(
                  `Saved and closed ${tabsToClose.length} tab(s) to the right`,
                );
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
            setTabValidationErrors({
              [tabId]: tabValidationErrors[tabId] || [],
            });
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

      logger.info('Closed tabs to right', {
        remainingTabs: remainingTabs.length,
      });
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
          const matchesSearch = item.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
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
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, content: newContent } : tab,
        ),
      );
    }),
    [],
  );

  // Handle tab dirty state changes
  const handleTabDirtyChange = useCallback(
    safeHandler((tabId: string, isDirty: boolean) => {
      setEditorTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, isDirty } : tab)),
      );
    }),
    [],
  );

  // Handle tab validation changes
  const handleTabValidationChange = useCallback(
    safeHandler((tabId: string, errors: ValidationError[]) => {
      setTabValidationErrors((prev) => ({ ...prev, [tabId]: errors }));
      setEditorTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, errors } : tab)),
      );
    }),
    [],
  );

  // Handle ref click to open referenced schema
  const handleRefClick = useCallback(
    safeHandler((refPath: string) => {
      logger.info('Ref click attempted', {
        refPath,
        availableSchemas: currentProject?.schemas?.map((s) => ({
          name: s.name,
          path: s.path,
        })),
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
        if (
          refPath.startsWith('./') &&
          schema.path.endsWith(refPath.substring(2))
        )
          return true;
        if (
          refPath.startsWith('../') &&
          schema.path.endsWith(refPath.substring(3))
        )
          return true;

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
          availableSchemas: currentProject?.schemas?.map((s) => ({
            name: s.name,
            path: s.path,
          })),
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
    errors: {
      schemaId: string;
      schemaName: string;
      errors: ValidationError[];
    }[];
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isBatchFormatting, setIsBatchFormatting] = useState(false);

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
    setCanScrollRight(
      hasHorizontalScroll && scrollLeft < scrollWidth - clientWidth - 1,
    );

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
          toast.success(
            `Batch validation complete: All ${results.total} schemas are valid!`,
          );
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
      return () =>
        tabContainer.removeEventListener('scroll', updateScrollButtons);
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
            const result = await window.api.writeFile(
              tab.schema.path,
              tab.content,
            );

            if (result.success) {
              setEditorTabs((prev) =>
                prev.map((t) =>
                  t.id === tab.id ? { ...t, isDirty: false } : t,
                ),
              );

              // Update in-memory project schema for each saved tab
              try {
                const parsed = JSON.parse(tab.content);
                useAppStore.setState((state) => ({
                  currentProject: state.currentProject
                    ? {
                        ...state.currentProject,
                        schemas: state.currentProject.schemas.map((s) =>
                          s.id === tab.schema.id
                            ? {
                                ...s,
                                content: parsed,
                                metadata: s.metadata
                                  ? {
                                      ...s.metadata,
                                      lastModified: new Date(),
                                      fileSize: tab.content.length,
                                    }
                                  : s.metadata,
                              }
                            : s,
                        ),
                      }
                    : null,
                }));
              } catch (_e) {
                // ignore
              }

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

              return {
                success: false,
                tabName: tab.schema.name,
                error: result.error,
              };
            }
          } catch (parseError) {
            logger.error('Tab save failed - invalid JSON', {
              schemaName: tab.schema.name,
              error:
                parseError instanceof Error ? parseError.message : parseError,
            });

            return {
              success: false,
              tabName: tab.schema.name,
              error: 'Invalid JSON',
            };
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
            description: failed
              .map((r) => `${r.tabName}: ${r.error}`)
              .join(', '),
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

  // Batch format (format + save all schemas on disk)
  const runBatchFormat = useCallback(
    safeHandler(async () => {
      if (!currentProject?.schemas?.length) {
        toast.error('No schemas to format');
        return;
      }

      setIsBatchFormatting(true);
      try {
        const results: Array<{
          name: string;
          success: boolean;
          error?: string;
        }> = [];

        for (const schema of currentProject.schemas) {
          try {
            const openTab = editorTabs.find((t) => t.schema.id === schema.id);

            // Determine source text: prefer open dirty tab content; else disk
            let sourceText: string | null = null;
            if (openTab && openTab.isDirty) {
              sourceText = openTab.content;
            } else {
              const read = await window.api.readFile(schema.path);
              if (!read.success || !read.data) {
                results.push({
                  name: schema.name,
                  success: false,
                  error: read.error || 'Read failed',
                });
                continue;
              }
              sourceText = read.data;
            }

            // Validate JSON before formatting/saving
            try {
              JSON.parse(sourceText);
            } catch (e) {
              results.push({
                name: schema.name,
                success: false,
                error: 'Invalid JSON',
              });
              continue;
            }

            // Apply custom formatter (enum + properties)
            const formatted = formatSchemaJsonString(sourceText);

            // Write file if there were changes, or if tab is dirty to persist edits
            const shouldWrite =
              formatted !== sourceText || (openTab && openTab.isDirty);
            const write = shouldWrite
              ? await window.api.writeFile(schema.path, formatted)
              : { success: true };
            if (!write.success) {
              results.push({
                name: schema.name,
                success: false,
                error: write.error || 'Write failed',
              });
              continue;
            }

            // Update in-memory project state
            try {
              const parsed = JSON.parse(formatted);
              useAppStore.setState((state) => ({
                currentProject: state.currentProject
                  ? {
                      ...state.currentProject,
                      schemas: state.currentProject.schemas.map((s) =>
                        s.id === schema.id
                          ? {
                              ...s,
                              content: parsed,
                              metadata: s.metadata
                                ? {
                                    ...s.metadata,
                                    lastModified: new Date(),
                                    fileSize: formatted.length,
                                  }
                                : s.metadata,
                            }
                          : s,
                      ),
                    }
                  : null,
              }));
            } catch (e) {
              logger.debug('Batch format: project state update failed', {
                error: e instanceof Error ? e.message : String(e),
              });
            }

            // Update any open tabs for this schema (mark clean and replace content)
            setEditorTabs((prev) =>
              prev.map((t) =>
                t.schema.id === schema.id
                  ? { ...t, content: formatted, isDirty: false }
                  : t,
              ),
            );

            results.push({ name: schema.name, success: true });
          } catch (error) {
            results.push({
              name: schema.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const ok = results.filter((r) => r.success).length;
        const fail = results.length - ok;
        if (fail === 0) {
          toast.success('Formatted all files successfully');
        } else {
          toast.error(`Failed to format ${fail} file(s)`);
        }

        logger.info('Batch format completed', {
          total: results.length,
          ok,
          fail,
        });
      } catch (error) {
        logger.error('Batch format failed', { error });
        toast.error('Batch format failed');
      } finally {
        setIsBatchFormatting(false);
      }
    }),
    [currentProject?.schemas],
  );

  // Listen to Monaco-dispatched Save All event
  useEffect(() => {
    const listener = () => {
      void handleSaveAll();
    };
    document.addEventListener('build-save-all', listener as EventListener);
    return () =>
      document.removeEventListener('build-save-all', listener as EventListener);
  }, [handleSaveAll]);

  // Context menu handlers
  const handleContextMenuOpen = useCallback((item: TreeItem) => {
    if (item.type === 'schema' && item.schema) {
      openSchemaTab(item.schema);
    }
  }, []);

  const handleContextMenuRename = useCallback((item: TreeItem) => {
    setContextMenuItem(item);
    setRenameValue(item.name);
    setIsRenameDialogOpen(true);
  }, []);

  const handleContextMenuDelete = useCallback((item: TreeItem) => {
    setContextMenuItem(item);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleContextMenuCopyPath = useCallback(
    async (item: TreeItem) => {
      try {
        const fullPath = currentProject?.path
          ? `${currentProject.path}/${item.path}`
          : item.path;
        await navigator.clipboard.writeText(fullPath);
        toast.success('Path copied to clipboard', {
          description: fullPath,
        });
      } catch (_error) {
        toast.error('Failed to copy path', {
          description: 'Could not copy to clipboard',
        });
      }
    },
    [currentProject?.path],
  );

  // Targeted app store update functions to avoid full project reload
  const updateAppStoreForCreate = useCallback(
    async (filePath: string, _templateType: string) => {
      if (!currentProject) return;

      try {
        // Read and process the new schema file
        const result = await (window as any).api.readFile(filePath);
        if (!result.success) {
          throw new Error('Failed to read new schema file');
        }

        const content = result.data;
        const relativePath = filePath.replace(currentProject.path + '/', '');
        const schemaId = `schema-${Date.now()}`;

        // Create basic schema object
        const newSchema: Schema = {
          id: schemaId,
          projectId: currentProject.id,
          name:
            relativePath.split('/').pop()?.replace('.schema.json', '') ||
            'New Schema',
          path: filePath,
          content: JSON.parse(content),
          metadata: {
            title: 'New Schema',
            description: 'Schema created from template',
            lastModified: new Date(),
            fileSize: content.length,
          },
          validationStatus: 'pending',
          relativePath,
          references: [],
          referencedBy: [],
        };

        // Update app store with new schema
        useAppStore.setState((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                schemas: [...state.currentProject.schemas, newSchema],
                schemaIds: [...state.currentProject.schemaIds, schemaId],
                status: {
                  ...state.currentProject.status,
                  totalSchemas: state.currentProject.status.totalSchemas + 1,
                },
              }
            : null,
        }));

        // Update tree items to reflect the new schema
        setTreeItems((prevItems) => {
          const updateItems = (items: TreeItem[]): TreeItem[] => {
            return items.map((item) => {
              if (
                item.type === 'folder' &&
                relativePath.startsWith(item.path)
              ) {
                const newItem: TreeItem = {
                  id: schemaId,
                  name: newSchema.name,
                  type: 'schema',
                  parentId: item.id,
                  children: [],
                  path: relativePath,
                  schema: newSchema,
                };

                return {
                  ...item,
                  children: [...item.children, newItem],
                };
              }

              if (item.children.length > 0) {
                return {
                  ...item,
                  children: updateItems(item.children),
                };
              }

              return item;
            });
          };

          return updateItems(prevItems);
        });
      } catch (error) {
        logger.error('Failed to update app store for new schema', {
          error,
          filePath,
        });
        throw error;
      }
    },
    [currentProject],
  );

  const updateAppStoreForDelete = useCallback(
    async (filePath: string) => {
      if (!currentProject) return;

      const relativePath = filePath.replace(currentProject.path + '/', '');

      // Find the schema to delete
      const schemaToDelete = currentProject.schemas.find(
        (s) => s.path === filePath,
      );
      if (!schemaToDelete) return;

      // Remove from app store
      useAppStore.setState((state) => ({
        currentProject: state.currentProject
          ? {
              ...state.currentProject,
              schemas: state.currentProject.schemas.filter(
                (s) => s.id !== schemaToDelete.id,
              ),
              schemaIds: state.currentProject.schemaIds.filter(
                (id) => id !== schemaToDelete.id,
              ),
              status: {
                ...state.currentProject.status,
                totalSchemas: state.currentProject.status.totalSchemas - 1,
              },
            }
          : null,
      }));

      // Close any editor tabs for this schema
      setEditorTabs((prev) =>
        prev.filter((tab) => tab.schema.id !== schemaToDelete.id),
      );
      if (activeTabId === schemaToDelete.id) {
        setActiveTabId(editorTabs[0]?.id || null);
      }

      // Update tree items to remove the deleted item
      setTreeItems((prevItems) => {
        const updateItems = (items: TreeItem[]): TreeItem[] => {
          return items
            .map((item) => {
              if (item.path === relativePath) {
                return null; // Remove item
              }

              if (item.children.length > 0) {
                return {
                  ...item,
                  children: updateItems(item.children).filter(
                    Boolean,
                  ) as TreeItem[],
                };
              }

              return item;
            })
            .filter(Boolean) as TreeItem[];
        };

        return updateItems(prevItems);
      });
    },
    [currentProject, editorTabs, activeTabId],
  );

  const updateAppStoreForRename = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!currentProject) return;

      const oldRelativePath = oldPath.replace(currentProject.path + '/', '');
      const newRelativePath = newPath.replace(currentProject.path + '/', '');

      // Find the schema to rename
      const schemaToRename = currentProject.schemas.find(
        (s) => s.path === oldPath,
      );
      if (!schemaToRename) return;

      // Update schema in app store
      const updatedSchema: Schema = {
        ...schemaToRename,
        path: newPath,
        relativePath: newRelativePath,
        name:
          newRelativePath.split('/').pop()?.replace('.schema.json', '') ||
          schemaToRename.name,
      };

      useAppStore.setState((state) => ({
        currentProject: state.currentProject
          ? {
              ...state.currentProject,
              schemas: state.currentProject.schemas.map((s) =>
                s.id === schemaToRename.id ? updatedSchema : s,
              ),
            }
          : null,
      }));

      // Update editor tabs if this schema is open
      setEditorTabs((prev) =>
        prev.map((tab) =>
          tab.schema.id === schemaToRename.id
            ? { ...tab, schema: updatedSchema }
            : tab,
        ),
      );

      // Update tree items to reflect the rename
      setTreeItems((prevItems) => {
        const updateItems = (items: TreeItem[]): TreeItem[] => {
          return items.map((item) => {
            if (item.path === oldRelativePath) {
              return {
                ...item,
                path: newRelativePath,
                name: updatedSchema.name,
                schema: updatedSchema,
              };
            }

            if (item.children.length > 0) {
              return {
                ...item,
                children: updateItems(item.children),
              };
            }

            return item;
          });
        };

        return updateItems(prevItems);
      });
    },
    [currentProject, editorTabs],
  );

  const handleRenameConfirm = safeAsyncHandler(async () => {
    if (!contextMenuItem || !currentProject || !renameValue.trim()) return;

    const oldPath = `${currentProject.path}/${contextMenuItem.path}`;
    const newPath = `${currentProject.path}/${contextMenuItem.path.replace(contextMenuItem.name, renameValue.trim())}`;

    const result = await (window as any).api.rename(oldPath, newPath);

    if (result.success) {
      setIsRenameDialogOpen(false);
      setContextMenuItem(null);
      setRenameValue('');
      // Update tree state locally instead of full reload
      updateAppStoreForRename(oldPath, newPath);
    } else {
      throw new Error(result.error || 'Rename failed');
    }
  });

  const handleDeleteConfirm = safeAsyncHandler(async () => {
    if (!contextMenuItem || !currentProject) return;

    const filePath = `${currentProject.path}/${contextMenuItem.path}`;
    const result = await (window as any).api.delete(filePath);

    if (result.success) {
      setIsDeleteDialogOpen(false);
      setContextMenuItem(null);
      // Update tree state locally instead of full reload
      updateAppStoreForDelete(filePath);
    } else {
      throw new Error(result.error || 'Delete failed');
    }
  });

  // File creation handlers
  const handleContextMenuCreateSchema = useCallback((item: TreeItem) => {
    setContextMenuItem(item);
    setNewSchemaName('');
    setIsCreateSchemaDialogOpen(true);
  }, []);

  const handleContextMenuCreateFolder = useCallback((item: TreeItem) => {
    setContextMenuItem(item);
    setNewFolderName('');
    setIsCreateFolderDialogOpen(true);
  }, []);

  const handleCreateSchemaConfirm = safeAsyncHandler(async () => {
    if (!contextMenuItem || !currentProject || !newSchemaName.trim()) return;

    const schemaFileName = `${newSchemaName.trim()}.schema.json`;
    const fullPath = `${currentProject.path}/${contextMenuItem.path}/${schemaFileName}`;

    const result = await (window as any).api.createSchema(fullPath, 'basic');

    if (result.success) {
      setIsCreateSchemaDialogOpen(false);
      setContextMenuItem(null);
      setNewSchemaName('');
      // Update tree state locally instead of full reload
      updateAppStoreForCreate(fullPath, 'basic');
    } else {
      throw new Error(result.error || 'Create schema failed');
    }
  });

  const handleCreateFolderConfirm = safeAsyncHandler(async () => {
    if (!contextMenuItem || !currentProject || !newFolderName.trim()) return;

    const folderPath = `${currentProject.path}/${contextMenuItem.path}/${newFolderName.trim()}`;
    const result = await (window as any).api.createFolder(folderPath);

    if (result.success) {
      setIsCreateFolderDialogOpen(false);
      setContextMenuItem(null);
      setNewFolderName('');
      // Update tree items to show new folder (no schema processing needed)
      setTreeItems((prevItems) => {
        const updateItems = (items: TreeItem[]): TreeItem[] => {
          return items.map((item) => {
            if (
              item.type === 'folder' &&
              contextMenuItem.path.startsWith(item.path)
            ) {
              const newFolder: TreeItem = {
                id: `folder-${Date.now()}`,
                name: newFolderName.trim(),
                type: 'folder',
                parentId: item.id,
                children: [],
                path: `${contextMenuItem.path}/${newFolderName.trim()}`,
                expanded: false,
              };

              return {
                ...item,
                children: [...item.children, newFolder],
              };
            }

            if (item.children.length > 0) {
              return {
                ...item,
                children: updateItems(item.children),
              };
            }

            return item;
          });
        };

        return updateItems(prevItems);
      });
    } else {
      throw new Error(result.error || 'Create folder failed');
    }
  });

  // Root-level creation handlers
  const handleCreateRootSchema = useCallback(() => {
    setRootSchemaName('');
    setIsCreateRootSchemaDialogOpen(true);
  }, []);

  const handleCreateRootFolder = useCallback(() => {
    setRootFolderName('');
    setIsCreateRootFolderDialogOpen(true);
  }, []);

  const handleCreateTemplateSchema = useCallback(() => {
    setTemplateSchemaName('');
    setIsCreateTemplateDialogOpen(true);
  }, []);

  const handleCreateRootSchemaConfirm = safeAsyncHandler(async () => {
    if (!currentProject || !rootSchemaName.trim()) return;

    const schemaFileName = `${rootSchemaName.trim()}.schema.json`;
    const fullPath = `${currentProject.path}/${schemaFileName}`;

    const result = await (window as any).api.createSchema(fullPath, 'basic');

    if (result.success) {
      setIsCreateRootSchemaDialogOpen(false);
      setRootSchemaName('');
      // Update app store with new schema
      updateAppStoreForCreate(fullPath, 'basic');
    } else {
      throw new Error(result.error || 'Create schema failed');
    }
  });

  const handleCreateRootFolderConfirm = safeAsyncHandler(async () => {
    if (!currentProject || !rootFolderName.trim()) return;

    const folderPath = `${currentProject.path}/${rootFolderName.trim()}`;
    const result = await (window as any).api.createFolder(folderPath);

    if (result.success) {
      setIsCreateRootFolderDialogOpen(false);
      setRootFolderName('');
      // Update tree items to show new root folder
      setTreeItems((prevItems) => {
        const newFolder: TreeItem = {
          id: `folder-${Date.now()}`,
          name: rootFolderName.trim(),
          type: 'folder',
          children: [],
          path: rootFolderName.trim(),
          expanded: false,
        };

        return [...prevItems, newFolder];
      });
    } else {
      throw new Error(result.error || 'Create folder failed');
    }
  });

  const handleCreateTemplateSchemaConfirm = safeAsyncHandler(async () => {
    if (!currentProject || !templateSchemaName.trim()) return;

    const schemaFileName = `${templateSchemaName.trim()}.schema.json`;
    const fullPath = `${currentProject.path}/${schemaFileName}`;

    const result = await (window as any).api.createSchema(
      fullPath,
      selectedTemplate,
    );

    if (result.success) {
      setIsCreateTemplateDialogOpen(false);
      setTemplateSchemaName('');
      // Update app store with new schema
      updateAppStoreForCreate(fullPath, selectedTemplate);
    } else {
      throw new Error('Failed to create schema');
    }
  });

  // Template preview function
  const getTemplatePreview = (
    schemaName: string,
    templateType: string,
  ): string => {
    const templates = {
      'simple-object': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          dateCreated: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
      'simple-array': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'array',
        items: { type: 'string' },
        minItems: 0,
        uniqueItems: true,
      },
      'complex-object': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          externalId: { type: 'string' },
          dateCreated: { type: 'string', format: 'date-time' },
          dateUpdated: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED'],
          },
        },
        additionalProperties: false,
      },
      'complex-array': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            value: { type: 'number' },
            dateCreated: { type: 'string', format: 'date-time' },
          },
          additionalProperties: false,
        },
        minItems: 0,
        uniqueItems: false,
      },
      enum: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'string',
        enum: ['OPTION_ONE', 'OPTION_TWO', 'OPTION_THREE', 'OPTION_FOUR'],
      },

      basic: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: schemaName,
        description: `${schemaName} schema`,
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    };

    return JSON.stringify(
      templates[templateType as keyof typeof templates] || templates.basic,
      null,
      2,
    );
  };

  // Render tree item
  const renderTreeItem = (item: TreeItem, depth = 0) => {
    const Icon =
      item.type === 'folder' ? (item.expanded ? FolderOpen : Folder) : FileText;
    const hasChildren = item.children.length > 0;
    const indentStyle = { paddingLeft: `${depth * 16 + 8}px` };

    return (
      <div key={item.id}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
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
                  variant={
                    item.schema.validationStatus === 'valid'
                      ? 'default'
                      : 'destructive'
                  }
                  className="ml-auto h-4 text-xs"
                >
                  {item.schema.validationStatus}
                </Badge>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            {item.type === 'schema' && (
              <ContextMenuItem onClick={() => handleContextMenuOpen(item)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Editor
              </ContextMenuItem>
            )}
            {item.type === 'folder' && (
              <>
                <ContextMenuItem
                  onClick={() => handleContextMenuCreateSchema(item)}
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  New Schema
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleContextMenuCreateFolder(item)}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCreateTemplateSchema}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Schema from Template
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => handleContextMenuRename(item)}>
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleContextMenuCopyPath(item)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Path
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => handleContextMenuDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {item.expanded &&
          item.children.map((child) => renderTreeItem(child, depth + 1))}
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
              {currentProject.name} ({currentProject.schemas?.length || 0}{' '}
              schemas)
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
              variant="outline"
              size="sm"
              onClick={runBatchFormat}
              disabled={isBatchFormatting || !currentProject.schemas?.length}
            >
              {isBatchFormatting ? (
                <PlayCircle className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Code className="w-4 h-4 mr-2" />
              )}
              {isBatchFormatting ? 'Formatting...' : 'Batch Format + Save'}
            </Button>
            {batchValidationResults && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchValidationResults(null)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Results ({batchValidationResults.valid}/
                {batchValidationResults.total})
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
        <div className="col-span-3 bg-muted/10 border-r border-border/50 flex flex-col min-h-0">
          <div className="p-3 border-b border-border/50 flex-shrink-0">
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
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <ScrollArea className="h-full w-full px-3">
                  {filteredTreeItems.length > 0 ? (
                    <div className="space-y-1">
                      {filteredTreeItems.map((item) => renderTreeItem(item))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <FileText className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? 'No schemas match your search'
                            : 'No schemas found'}
                        </p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem onClick={handleCreateRootSchema}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  New Schema
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCreateRootFolder}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCreateTemplateSchema}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Schema from Template
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>

        {/* Editor Area */}
        <div className="col-span-9 flex flex-col min-h-0">
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
                            overflowY: 'hidden',
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
                                <span className="text-sm">
                                  {tab.schema.name}
                                </span>
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
                        <ContextMenuItem
                          onClick={() =>
                            activeTabId && handleSaveTab(activeTabId)
                          }
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Tab
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() =>
                            activeTabId && handleFormatTab(activeTabId)
                          }
                        >
                          <Code className="w-4 h-4 mr-2" />
                          Format Tab
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => activeTabId && closeTab(activeTabId)}
                        >
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
                          onClick={() =>
                            activeTabId && closeTabsToLeft(activeTabId)
                          }
                          disabled={
                            !activeTabId ||
                            editorTabs.findIndex(
                              (t) => t.id === activeTabId,
                            ) === 0
                          }
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Close Tabs to Left
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() =>
                            activeTabId && closeTabsToRight(activeTabId)
                          }
                          disabled={
                            !activeTabId ||
                            editorTabs.findIndex(
                              (t) => t.id === activeTabId,
                            ) ===
                              editorTabs.length - 1
                          }
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Close Tabs to Right
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() =>
                            activeTabId && closeOtherTabs(activeTabId)
                          }
                          disabled={!activeTabId || editorTabs.length <= 1}
                        >
                          <Minus className="w-4 h-4 mr-2" />
                          Close Other Tabs
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={handleSaveAll}
                          disabled={isSaving}
                        >
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
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className="mt-0 flex-1 min-h-0"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex-1">
                      {/* Monaco Editor */}
                      <div className="flex flex-col h-full">
                        <SchemaEditor
                          schema={tab.schema}
                          content={tab.content}
                          isDirty={tab.isDirty}
                          onContentChange={(content) =>
                            handleTabContentChange(tab.id, content)
                          }
                          onDirtyChange={(isDirty) =>
                            handleTabDirtyChange(tab.id, isDirty)
                          }
                          onValidationChange={(errors) =>
                            handleTabValidationChange(tab.id, errors)
                          }
                          onSaved={(savedContent) => {
                            // Persist to store so navigation away/back reflects the save
                            try {
                              const parsed = JSON.parse(savedContent);
                              useAppStore.setState((state) => ({
                                currentProject: state.currentProject
                                  ? {
                                      ...state.currentProject,
                                      schemas: state.currentProject.schemas.map(
                                        (s) =>
                                          s.id === tab.schema.id
                                            ? {
                                                ...s,
                                                content: parsed,
                                                metadata: s.metadata
                                                  ? {
                                                      ...s.metadata,
                                                      lastModified: new Date(),
                                                      fileSize:
                                                        savedContent.length,
                                                    }
                                                  : s.metadata,
                                              }
                                            : s,
                                      ),
                                    }
                                  : null,
                              }));
                              // Only update tab content if it's actually different from current tab content
                              // This prevents Monaco from seeing unnecessary prop changes that cause "reverts"
                              setEditorTabs((prev) =>
                                prev.map((t) => {
                                  if (t.id === tab.id) {
                                    // Only update if the saved content is different from current tab content
                                    if (t.content !== savedContent) {
                                      return {
                                        ...t,
                                        content: savedContent,
                                        isDirty: false,
                                      };
                                    } else {
                                      // Content is the same, just update dirty state
                                      return {
                                        ...t,
                                        isDirty: false,
                                      };
                                    }
                                  }
                                  return t;
                                }),
                              );
                            } catch (_e) {
                              // ignore
                            }
                          }}
                          errors={tabValidationErrors[tab.id] || []}
                          availableSchemas={
                            currentProject?.schemas?.map((schema) => ({
                              id: schema.id,
                              name: schema.name,
                              path: schema.path,
                            })) || []
                          }
                          onRefClick={handleRefClick}
                          isSaving={isSaving}
                        />
                      </div>
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
              <DialogDescription>
                {confirmationDialog.message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={
                  confirmationDialog.cancelAction ||
                  (() => setConfirmationDialog(null))
                }
              >
                Close
              </Button>
              <Button onClick={confirmationDialog.action}>Save & Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Rename {contextMenuItem?.type === 'folder' ? 'Folder' : 'Schema'}
            </DialogTitle>
            <DialogDescription>
              Enter a new name for "{contextMenuItem?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!renameValue.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {contextMenuItem?.type === 'folder' ? 'Folder' : 'Schema'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{contextMenuItem?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Schema Dialog */}
      <Dialog
        open={isCreateSchemaDialogOpen}
        onOpenChange={setIsCreateSchemaDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Schema</DialogTitle>
            <DialogDescription>
              Create a new schema in "{contextMenuItem?.name}". The .schema.json
              extension will be added automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="Enter schema name (e.g., User, Product, Order)"
                autoFocus
                className="pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                .schema.json
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSchemaDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchemaConfirm}
              disabled={!newSchemaName.trim()}
            >
              Create Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in "{contextMenuItem?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolderConfirm}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Root Schema Dialog */}
      <Dialog
        open={isCreateRootSchemaDialogOpen}
        onOpenChange={setIsCreateRootSchemaDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Schema</DialogTitle>
            <DialogDescription>
              Create a new schema in the root directory. The .schema.json
              extension will be added automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input
                value={rootSchemaName}
                onChange={(e) => setRootSchemaName(e.target.value)}
                placeholder="Enter schema name (e.g., User, Product, Order)"
                autoFocus
                className="pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                .schema.json
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateRootSchemaDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRootSchemaConfirm}
              disabled={!rootSchemaName.trim()}
            >
              Create Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Root Folder Dialog */}
      <Dialog
        open={isCreateRootFolderDialogOpen}
        onOpenChange={setIsCreateRootFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in the root directory
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={rootFolderName}
              onChange={(e) => setRootFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateRootFolderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRootFolderConfirm}
              disabled={!rootFolderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Schema Dialog */}
      <Dialog
        open={isCreateTemplateDialogOpen}
        onOpenChange={setIsCreateTemplateDialogOpen}
      >
        <DialogContent size="lg" className="max-h-[95vh] w-[900px]">
          <DialogHeader>
            <DialogTitle>Create Schema from Template</DialogTitle>
            <DialogDescription>
              Create a new schema using a predefined template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Schema Name
                </label>
                <div className="relative">
                  <Input
                    value={templateSchemaName}
                    onChange={(e) => setTemplateSchemaName(e.target.value)}
                    placeholder="Enter schema name"
                    autoFocus
                    className="pr-20"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    .schema.json
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Template Type
                </label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple-object">Simple Object</SelectItem>
                    <SelectItem value="simple-array">Simple Array</SelectItem>
                    <SelectItem value="complex-object">
                      Complex Object
                    </SelectItem>
                    <SelectItem value="complex-array">Complex Array</SelectItem>
                    <SelectItem value="enum">Enum</SelectItem>
                    <SelectItem value="basic">Basic (Empty)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Template Preview
              </label>
              <div className="border rounded-md p-4 bg-muted/50 max-h-80 overflow-auto">
                <pre className="text-xs">
                  {templateSchemaName.trim()
                    ? getTemplatePreview(
                        templateSchemaName.trim(),
                        selectedTemplate,
                      )
                    : 'Enter a schema name to see preview'}
                </pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplateSchemaConfirm}
              disabled={!templateSchemaName.trim()}
            >
              Create from Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
