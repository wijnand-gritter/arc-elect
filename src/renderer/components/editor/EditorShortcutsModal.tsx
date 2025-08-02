/**
 * Editor Shortcuts Modal component.
 *
 * This component displays a modal with all available keyboard shortcuts
 * for the editor, with platform-specific key combinations.
 *
 * @module EditorShortcutsModal
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Save, SaveAll, Code, Zap, ArrowRight, Keyboard } from 'lucide-react';

/**
 * Props for the Editor Shortcuts Modal component.
 */
interface EditorShortcutsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
}

/**
 * Interface for a keyboard shortcut.
 */
interface Shortcut {
  /** Action name */
  action: string;
  /** Description of the action */
  description: string;
  /** Keyboard shortcut */
  shortcut: string;
  /** Icon for the action */
  icon: React.ComponentType<{ className?: string }>;
  /** Category of the shortcut */
  category: 'file' | 'edit' | 'navigation' | 'refs';
}

/**
 * Editor Shortcuts Modal component.
 */
export function EditorShortcutsModal({
  open,
  onOpenChange,
}: EditorShortcutsModalProps): React.JSX.Element {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Platform-specific key symbols
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const shiftKey = '⇧';
  const altKey = isMac ? '⌥' : 'Alt';

  // Define all shortcuts
  const shortcuts: Shortcut[] = [
    // File operations
    {
      action: 'Save Current File',
      description: 'Save the currently active file',
      shortcut: `${cmdKey} + S`,
      icon: Save,
      category: 'file',
    },
    {
      action: 'Save All Files',
      description: 'Save all open files',
      shortcut: `${cmdKey} + ${shiftKey} + S`,
      icon: SaveAll,
      category: 'file',
    },
    // Edit operations
    {
      action: 'Format Document',
      description: 'Format the current JSON document',
      shortcut: `${shiftKey} + ${altKey} + F`,
      icon: Code,
      category: 'edit',
    },
    {
      action: 'Validate JSON',
      description: 'Validate the current JSON syntax',
      shortcut: `${cmdKey} + ${shiftKey} + V`,
      icon: Zap,
      category: 'edit',
    },
    // Navigation
    {
      action: 'Navigate to Reference',
      description: 'Go to the referenced schema (when cursor is on $ref)',
      shortcut: `${cmdKey} + F12`,
      icon: ArrowRight,
      category: 'navigation',
    },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, Shortcut[]>,
  );

  const categoryLabels = {
    file: 'File Operations',
    edit: 'Edit Operations',
    navigation: 'Navigation',
    refs: 'Reference Operations',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Editor Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Keyboard shortcuts for the JSON Schema editor. Use these shortcuts to work more
            efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <shortcut.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{shortcut.action}</div>
                        <div className="text-xs text-muted-foreground">{shortcut.description}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {shortcut.shortcut}
                    </Badge>
                  </div>
                ))}
              </div>
              {category !==
                Object.keys(groupedShortcuts)[Object.keys(groupedShortcuts).length - 1] && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Platform-specific keys:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                • {cmdKey} = {isMac ? 'Command' : 'Control'}
              </div>
              <div>• {shiftKey} = Shift</div>
              <div>
                • {altKey} = {isMac ? 'Option' : 'Alt'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditorShortcutsModal;
