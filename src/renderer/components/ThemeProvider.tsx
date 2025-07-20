/**
 * ThemeProvider component for theme management.
 *
 * This component provides theme context and management functionality
 * for the application. It supports light, dark, and system themes
 * with automatic synchronization with the main process settings.
 *
 * @module ThemeProvider
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Available theme options for the application.
 */
type Theme = 'light' | 'dark' | 'system';

/**
 * Interface defining the theme context structure.
 */
interface ThemeContextType {
  /** Current theme setting */
  theme: Theme;
  /** Function to set a new theme */
  setTheme: (theme: Theme) => void;
}

/**
 * Theme context for providing theme state throughout the application.
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Props interface for the ThemeProvider component.
 */
interface ThemeProviderProps {
  /** Child components to be wrapped by the provider */
  children: React.ReactNode;
  /** Default theme to use if none is set */
  defaultTheme?: Theme;
  /** Storage key for persisting theme preference */
  storageKey?: string;
}

/**
 * ThemeProvider component for theme management.
 *
 * This component provides theme context and management functionality
 * for the application. It supports:
 * - Light, dark, and system themes
 * - Automatic theme persistence
 * - Synchronization with main process settings
 * - System theme detection
 *
 * @param props - Component props
 * @param props.children - Child components to wrap
 * @param props.defaultTheme - Default theme to use
 * @param props.storageKey - Storage key for theme persistence
 * @returns JSX element providing theme context
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  const storeTheme = useAppStore((state) => state.theme);
  const storeSetTheme = useAppStore((state) => state.setTheme);

  /**
   * Updates the theme and persists it to storage.
   *
   * @param newTheme - The new theme to set
   */
  const updateTheme = (newTheme: Theme): void => {
    setTheme(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  /**
   * Applies the theme to the document element.
   *
   * @param currentTheme - The theme to apply
   */
  const applyTheme = (currentTheme: Theme): void => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (currentTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(currentTheme);
  };

  /**
   * Handles system theme changes when using system theme.
   */
  const handleSystemThemeChange = (): void => {
    if (theme === 'system') {
      applyTheme('system');
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Sync with store theme on mount
    if (storeTheme && storeTheme !== theme) {
      updateTheme(storeTheme);
    }
  }, [storeTheme]);

  /**
   * Sets the theme and synchronizes with the store.
   *
   * @param newTheme - The new theme to set
   */
  const setThemeAndSync = async (newTheme: Theme): Promise<void> => {
    updateTheme(newTheme);
    await storeSetTheme(newTheme);
  };

  const value = {
    theme,
    setTheme: setThemeAndSync,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook for accessing the theme context.
 *
 * This hook provides access to the current theme and theme setter
 * function. It must be used within a ThemeProvider.
 *
 * @returns Theme context with current theme and setter function
 * @throws Error if used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, setTheme } = useTheme();
 *
 * // Change theme
 * setTheme('dark');
 * ```
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
