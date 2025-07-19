/**
 * Central app state management with Zustand and IPC integration.
 *
 * This store manages global application state including theme settings,
 * current page navigation, and synchronization with the main process.
 *
 * @module useAppStore
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import logger from '../lib/renderer-logger';

/**
 * Available theme options for the application.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Available page routes in the application.
 */
export type Page = 'home' | 'about' | 'settings';

/**
 * Interface defining the structure of the application state.
 */
interface AppState {
  /** Current theme setting */
  theme: Theme;
  /** Current active page */
  currentPage: Page;
  /** Function to update the theme setting */
  setTheme: (theme: Theme) => Promise<void>;
  /** Function to navigate to a different page */
  setPage: (page: Page) => void;
  /** Function to load theme from main process settings */
  loadTheme: () => Promise<void>;
}

/**
 * Zustand store for global application state management.
 *
 * This store provides:
 * - Theme management with IPC synchronization
 * - Page navigation state
 * - Persistent storage of theme preferences
 *
 * @example
 * ```tsx
 * const theme = useAppStore((state) => state.theme);
 * const setTheme = useAppStore((state) => state.setTheme);
 *
 * // Change theme
 * await setTheme('dark');
 * ```
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, _get) => ({
      theme: 'system',
      currentPage: 'home',

      /**
       * Updates the theme setting and synchronizes with main process.
       *
       * @param theme - The new theme to set
       * @returns Promise that resolves when theme is updated
       */
      setTheme: async (theme: Theme) => {
        const result = await window.api.setTheme(theme);
        if (result.success) {
          set({ theme });
        }
      },

      /**
       * Navigates to a different page in the application.
       *
       * @param page - The page to navigate to
       */
      setPage: (page: Page) => {
        set({ currentPage: page });
      },

      /**
       * Loads the theme setting from the main process.
       *
       * This function is typically called on application startup
       * to restore the user's theme preference.
       *
       * @returns Promise that resolves when theme is loaded
       */
      loadTheme: async () => {
        const startTime = Date.now();
        logger.info('Store: Loading theme - START');

        try {
          const result = await window.api.getTheme();
          if (result.success && result.theme) {
            set({ theme: result.theme });
          }
        } catch (error) {
          logger.error('Failed to load theme:', error);
        }

        logger.info(`Store: Theme loaded in ${Date.now() - startTime}ms`);
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
