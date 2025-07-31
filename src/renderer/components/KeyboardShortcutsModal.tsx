/**
 * Keyboard shortcuts help modal component for JSON Schema Editor.
 *
 * This component displays all available keyboard shortcuts organized by category
 * to help users discover and learn productivity features.
 *
 * @module KeyboardShortcutsModal
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Keyboard, Navigation, Search, Edit, FolderOpen, Settings } from 'lucide-react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/**
 * Keyboard shortcuts modal props.
 */
interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function called when modal should close */
  onClose: () => void;
}

/**
 * Category icons mapping.
 */
const categoryIcons = {
  navigation: Navigation,
  search: Search,
  editor: Edit,
  project: FolderOpen,
  general: Settings,
};

/**
 * Format shortcut key for display.
 */
function formatShortcutKey(shortcut: {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}): string {
  const parts: string[] = [];

  // Detect platform for modifier key display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Add modifiers in consistent order
  if (shortcut.ctrl && !shortcut.meta) parts.push(isMac ? 'Ctrl' : 'Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push(isMac ? 'Cmd' : 'Ctrl');

  // Add the main key
  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}

/**
 * Keyboard shortcuts help modal component.
 *
 * This component displays all available keyboard shortcuts
 * organized by category in a tabbed interface.
 *
 * @param props - Component props
 * @returns JSX element representing the keyboard shortcuts modal
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal
 *   isOpen={isHelpModalOpen}
 *   onClose={() => setIsHelpModalOpen(false)}
 * />
 * ```
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.JSX.Element {
  const { shortcuts } = useKeyboardShortcuts({ enableGlobal: false });

  /**
   * Filter shortcuts by OS and remove duplicates.
   */
  const filteredShortcuts = useMemo(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    return shortcuts.filter((shortcut: any) => {
      // Skip disabled shortcuts
      if (shortcut.enabled === false) return false;

      // For help shortcuts, only show OS-relevant ones
      if (shortcut.description.includes('Show keyboard shortcuts help')) {
        if (isMac) {
          // On macOS, only show F1 and Cmd + F1
          return shortcut.key === 'F1' && (!shortcut.ctrl || shortcut.meta);
        } else {
          // On Windows/Linux, only show F1 and Ctrl + F1
          return shortcut.key === 'F1' && (!shortcut.meta || shortcut.ctrl);
        }
      }

      return true;
    });
  }, [shortcuts]);

  /**
   * Group shortcuts by category.
   */
  const shortcutsByCategory = useMemo(() => {
    const grouped = filteredShortcuts.reduce(
      (acc: any, shortcut: any) => {
        const category = shortcut.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
      },
      {} as Record<string, typeof shortcuts>,
    );

    // Sort each category by key combination
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a: any, b: any) => {
        const aKey = formatShortcutKey(a);
        const bKey = formatShortcutKey(b);
        return aKey.localeCompare(bKey);
      });
    });

    return grouped;
  }, [filteredShortcuts]);

  /**
   * Get category order for consistent display.
   */
  const categoryOrder = ['navigation', 'search', 'editor', 'project', 'general'];
  const sortedCategories = categoryOrder.filter((cat) => shortcutsByCategory[cat]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" layout="flex" className="max-h-[90vh] overflow-hidden w-[800px]">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate, search, edit, and manage your JSON Schema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue={sortedCategories[0]} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              {sortedCategories.map((category) => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{category}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex-1 min-h-0 h-[500px]">
              <ScrollArea className="h-full">
                {sortedCategories.map((category) => {
                  const shortcuts = shortcutsByCategory[category];
                  return (
                    <TabsContent key={category} value={category} className="h-full mt-0">
                      <Card className="h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center space-x-2">
                            {React.createElement(
                              categoryIcons[category as keyof typeof categoryIcons],
                              {
                                className: 'h-5 w-5 text-primary',
                              },
                            )}
                            <span className="capitalize">{category}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 h-[400px] overflow-y-auto">
                          {shortcuts.length > 0 ? (
                            shortcuts.map((shortcut: any, index: number) => (
                              <div
                                key={`${category}-${index}`}
                                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{shortcut.description}</p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs font-semibold ml-4"
                                >
                                  {formatShortcutKey(shortcut)}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <p className="text-sm">No shortcuts available for this category.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
