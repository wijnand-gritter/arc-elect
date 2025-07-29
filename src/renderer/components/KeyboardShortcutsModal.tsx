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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Keyboard,
  Navigation,
  Search,
  FileText,
  Settings,
  Zap,
} from 'lucide-react';
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
 * Category icon mapping.
 */
const categoryIcons = {
  navigation: Navigation,
  search: Search,
  editor: FileText,
  project: Settings,
  general: Zap,
};

/**
 * Category descriptions.
 */
const categoryDescriptions = {
  navigation: 'Navigate between pages and sections',
  search: 'Search and filter functionality',
  editor: 'Schema editing and management',
  project: 'Project-level operations',
  general: 'General application shortcuts',
};

/**
 * Format shortcut key combination for display.
 */
function formatShortcutKey(shortcut: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }): string {
  const parts: string[] = [];
  
  // Add modifiers in consistent order
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('Cmd');
  
  // Add the main key
  let key = shortcut.key;
  
  // Format special keys for better readability
  const keyMappings: Record<string, string> = {
    'Escape': 'Esc',
    'Enter': '↵',
    'Tab': '⇥',
    'Delete': 'Del',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space',
  };
  
  if (keyMappings[key]) {
    key = keyMappings[key];
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }
  
  parts.push(key);
  
  return parts.join(' + ');
}

/**
 * Keyboard shortcuts help modal component.
 *
 * Displays all available keyboard shortcuts organized by category
 * with clear visual indicators and descriptions.
 *
 * @param props - Component props
 * @returns JSX element representing the shortcuts modal
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal
 *   isOpen={isHelpOpen}
 *   onClose={() => setIsHelpOpen(false)}
 * />
 * ```
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.JSX.Element {
  const { shortcuts } = useKeyboardShortcuts({ enableGlobal: false });

  /**
   * Group shortcuts by category.
   */
  const shortcutsByCategory = useMemo(() => {
    const grouped = shortcuts
      .filter(shortcut => shortcut.enabled !== false)
      .reduce((acc, shortcut) => {
        const category = shortcut.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
      }, {} as Record<string, typeof shortcuts>);

    // Sort each category by key combination
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        const aKey = formatShortcutKey(a);
        const bKey = formatShortcutKey(b);
        return aKey.localeCompare(bKey);
      });
    });

    return grouped;
  }, [shortcuts]);

  /**
   * Get category order for consistent display.
   */
  const categoryOrder = ['navigation', 'search', 'editor', 'project', 'general'];
  const sortedCategories = categoryOrder.filter(cat => shortcutsByCategory[cat]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </DialogTitle>
          <DialogDescription>
            Discover keyboard shortcuts to boost your productivity while working with JSON schemas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {sortedCategories.map((category) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              const shortcuts = shortcutsByCategory[category];

              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="capitalize">{category}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={`${category}-${index}`}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {shortcut.description}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="font-mono text-xs font-semibold"
                        >
                          {formatShortcutKey(shortcut)}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {/* Tips section */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Pro Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Focus Management:</strong> Most shortcuts work globally, but some are disabled when typing in input fields.
                  </p>
                  <Separator />
                  <p className="text-sm">
                    <strong>Search Shortcuts:</strong> Use <Badge variant="outline" className="font-mono text-xs">Ctrl + F</Badge> to focus search anywhere, or <Badge variant="outline" className="font-mono text-xs">Ctrl + K</Badge> for quick search.
                  </p>
                  <Separator />
                  <p className="text-sm">
                    <strong>Navigation:</strong> Use <Badge variant="outline" className="font-mono text-xs">Ctrl + 1/2/3</Badge> to quickly switch between Explore, Build, and Analytics.
                  </p>
                  <Separator />
                  <p className="text-sm">
                    <strong>Accessibility:</strong> All shortcuts respect accessibility guidelines and work with screen readers.
                  </p>
                  <Separator />
                  <p className="text-sm">
                    <strong>Platform Notes:</strong> On macOS, <Badge variant="outline" className="font-mono text-xs">Ctrl</Badge> shortcuts may use <Badge variant="outline" className="font-mono text-xs">Cmd</Badge> instead.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer info */}
            <div className="text-center text-xs text-muted-foreground">
              <p>
                Press <Badge variant="outline" className="font-mono text-xs">Shift + ?</Badge> to show this help anytime
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
