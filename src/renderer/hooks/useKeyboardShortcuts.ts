/**
 * Keyboard shortcuts hook for JSON Schema Editor.
 *
 * This hook provides comprehensive keyboard shortcut functionality
 * to enhance navigation and productivity for power users.
 *
 * @module useKeyboardShortcuts
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { safeHandler } from '../lib/error-handling';

/**
 * Keyboard shortcut definition.
 */
interface KeyboardShortcut {
  /** Shortcut key combination */
  key: string;
  /** Modifier keys */
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  /** Shortcut description */
  description: string;
  /** Shortcut category */
  category: 'navigation' | 'editor' | 'project' | 'search' | 'general';
  /** Function to execute */
  action: () => void;
  /** Whether shortcut is enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

/**
 * Keyboard shortcuts options.
 */
interface KeyboardShortcutsOptions {
  /** Enable global shortcuts */
  enableGlobal?: boolean;
  /** Enable debugging */
  enableDebug?: boolean;
  /** Scope element for shortcuts (default: document) */
  scope?: HTMLElement | Document;
  /** Custom handlers for specific shortcuts */
  customHandlers?: Record<string, () => void>;
}

/**
 * Hook for keyboard shortcuts functionality.
 *
 * Provides comprehensive keyboard navigation and shortcuts for
 * enhanced productivity and accessibility.
 *
 * @param options - Keyboard shortcuts configuration
 * @returns Keyboard shortcuts utilities
 *
 * @example
 * ```tsx
 * const { shortcuts, registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
 *   enableGlobal: true,
 *   enableDebug: true
 * });
 *
 * // Register custom shortcut
 * registerShortcut({
 *   key: 's',
 *   ctrl: true,
 *   description: 'Save current schema',
 *   category: 'editor',
 *   action: () => saveCurrentSchema()
 * });
 * ```
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}): {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  isShortcutPressed: (
    event: KeyboardEvent,
    shortcut: KeyboardShortcut,
  ) => boolean;
} {
  const {
    enableGlobal = true,
    enableDebug = false,
    scope = document,
    customHandlers = {},
  } = options;

  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());

  // App store access
  const setPage = useAppStore((state) => state.setPage);
  const currentProject = useAppStore((state) => state.currentProject);
  const closeAllModals = useAppStore((state) => state.closeAllModals);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);

  /**
   * Check if shortcut matches keyboard event.
   */
  const isShortcutPressed = useCallback(
    (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === event.ctrlKey;
      const altMatch = !!shortcut.alt === event.altKey;
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const metaMatch = !!shortcut.meta === event.metaKey;

      // Special handling for macOS Cmd + ? combination
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (isMac && shortcut.key === '?' && shortcut.meta && !shortcut.shift) {
        // On macOS, ? requires Shift, so Cmd + ? should be Cmd + Shift + ?
        const adjustedShiftMatch = event.shiftKey;
        return (
          keyMatch && ctrlMatch && altMatch && adjustedShiftMatch && metaMatch
        );
      }

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
    },
    [],
  );

  /**
   * Generate shortcut key for storage.
   */
  const generateShortcutKey = useCallback(
    (shortcut: KeyboardShortcut): string => {
      const modifiers = [];
      if (shortcut.ctrl) modifiers.push('ctrl');
      if (shortcut.alt) modifiers.push('alt');
      if (shortcut.shift) modifiers.push('shift');
      if (shortcut.meta) modifiers.push('meta');

      return `${modifiers.join('+')}_${shortcut.key.toLowerCase()}`;
    },
    [],
  );

  /**
   * Default keyboard shortcuts.
   */
  const defaultShortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: '1',
      ctrl: true,
      description: 'Navigate to Projects page',
      category: 'navigation',
      action: safeHandler(() => setPage('project')),
    },
    {
      key: '2',
      ctrl: true,
      description: 'Navigate to Explore page',
      category: 'navigation',
      action: safeHandler(() => setPage('explore')),
    },
    {
      key: '3',
      ctrl: true,
      description: 'Navigate to Analytics page',
      category: 'navigation',
      action: safeHandler(() => setPage('analytics')),
    },
    {
      key: '4',
      ctrl: true,
      description: 'Navigate to Build page',
      category: 'navigation',
      action: safeHandler(() => setPage('build')),
    },
    {
      key: '5',
      ctrl: true,
      description: 'Navigate to Build page',
      category: 'navigation',
      action: safeHandler(() => setPage('build')),
    },

    // Search shortcuts
    {
      key: 'f',
      ctrl: true,
      description: 'Focus search',
      category: 'search',
      action: safeHandler(() => {
        const searchInput = document.querySelector(
          'input[placeholder*="search" i]',
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }),
      preventDefault: true,
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Quick search (Command Palette)',
      category: 'search',
      action: safeHandler(() => {
        // Focus search and clear current query
        setSearchQuery('');
        const searchInput = document.querySelector(
          'input[placeholder*="search" i]',
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }),
      preventDefault: true,
    },

    // Modal shortcuts
    {
      key: 'Escape',
      description: 'Close modals and overlays',
      category: 'general',
      action: safeHandler(() => closeAllModals()),
    },

    // Project shortcuts
    {
      key: 'o',
      ctrl: true,
      description: 'Open project',
      category: 'project',
      action: safeHandler(() => {
        // Trigger project creation modal
        // This would need to be implemented in the project overview
      }),
      preventDefault: true,
    },
    {
      key: 's',
      ctrl: true,
      description: 'Save project',
      category: 'project',
      action: safeHandler(() => {
        if (currentProject) {
          // Trigger project save
        }
      }),
      preventDefault: true,
    },

    // Editor shortcuts
    {
      key: 'Enter',
      description: 'Open selected schema',
      category: 'editor',
      action: safeHandler(() => {
        // Find selected schema and open it
        const selectedCard = document.querySelector('[aria-selected="true"]');
        if (selectedCard) {
          selectedCard.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
          );
        }
      }),
    },

    // Accessibility shortcuts
    {
      key: 'Tab',
      description: 'Navigate between elements',
      category: 'navigation',
      action: safeHandler(() => {
        // Tab navigation is handled by browser
      }),
    },
    // Help shortcuts - universal and platform specific
    {
      key: 'F1',
      description: 'Show keyboard shortcuts help',
      category: 'general',
      action: safeHandler(() => {
        // Show help modal with shortcuts
        // Dispatch custom event to trigger help modal
        const event = new CustomEvent('show-help-modal');
        document.dispatchEvent(event);
      }),
    },
    // Alternative help shortcut for laptops with function keys disabled
    {
      key: 'F1',
      ctrl: true,
      description: 'Show keyboard shortcuts help (Ctrl + F1)',
      category: 'general',
      action: safeHandler(() => {
        const event = new CustomEvent('show-help-modal');
        document.dispatchEvent(event);
      }),
    },
    // macOS alternative help shortcut for laptops
    {
      key: 'F1',
      meta: true,
      description: 'Show keyboard shortcuts help (Cmd + F1)',
      category: 'general',
      action: safeHandler(() => {
        const event = new CustomEvent('show-help-modal');
        document.dispatchEvent(event);
      }),
    },

    // Quick actions
    {
      key: 'n',
      ctrl: true,
      description: 'Create new schema',
      category: 'editor',
      action: safeHandler(() => {
        // This would trigger the new schema creation flow
      }),
      preventDefault: true,
    },
    {
      key: 'd',
      ctrl: true,
      description: 'Duplicate selected schema',
      category: 'editor',
      action: safeHandler(() => {
        // Duplicate schema functionality
      }),
      preventDefault: true,
    },
    {
      key: 'Delete',
      description: 'Delete selected schema',
      category: 'editor',
      action: safeHandler(() => {
        // Delete schema functionality
      }),
    },

    // View shortcuts
    {
      key: 'r',
      ctrl: true,
      description: 'Refresh current view',
      category: 'general',
      action: safeHandler(() => {
        // Trigger view refresh
      }),
      preventDefault: true,
    },
    {
      key: 'F5',
      description: 'Reload application',
      category: 'general',
      action: safeHandler(() => {
        if (enableDebug) {
          location.reload();
        }
      }),
    },
  ];

  /**
   * Register a keyboard shortcut.
   */
  const registerShortcut = useCallback(
    (shortcut: KeyboardShortcut): void => {
      const key = generateShortcutKey(shortcut);
      shortcutsRef.current.set(key, {
        ...shortcut,
        enabled: shortcut.enabled ?? true,
      });
    },
    [generateShortcutKey],
  );

  /**
   * Unregister a keyboard shortcut.
   */
  const unregisterShortcut = useCallback((key: string): void => {
    shortcutsRef.current.delete(key);
  }, []);

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Skip if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow some shortcuts even in inputs (like Escape)
      const allowInInputs = ['Escape', 'Tab'];

      if (isInput && !allowInInputs.includes(event.key)) {
        return;
      }

      // Check all registered shortcuts
      for (const [key, shortcut] of shortcutsRef.current.entries()) {
        if (!shortcut.enabled) continue;

        if (isShortcutPressed(event, shortcut)) {
          // Check for custom handler first
          const shortcutId = key.split('_').pop(); // Extract base key from compound key
          if (customHandlers[shortcutId || key]) {
            customHandlers[shortcutId || key]();
          } else {
            shortcut.action();
          }

          if (shortcut.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }

          break; // Only execute first matching shortcut
        }
      }
    },
    [isShortcutPressed],
  );

  /**
   * Initialize default shortcuts.
   */
  useEffect(() => {
    defaultShortcuts.forEach(registerShortcut);
  }, [registerShortcut]);

  /**
   * Set up keyboard event listeners.
   */
  useEffect(() => {
    if (!enableGlobal) return;

    const element = scope as HTMLElement | Document;
    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [enableGlobal, scope, handleKeyDown]);

  /**
   * Get current shortcuts list.
   */
  const shortcuts = Array.from(shortcutsRef.current.values());

  return {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    isShortcutPressed,
  };
}
