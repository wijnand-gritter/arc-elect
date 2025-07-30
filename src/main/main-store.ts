/**
 * Central settings handler for the main process using electron-store.
 *
 * This module handles theme setting and data management via IPC.
 * It provides a secure interface for the renderer process to
 * read, write, and manage application settings.
 *
 * @module main-store
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { ipcMain } from 'electron';
import Store from 'electron-store';
import { withErrorHandling, validateInput } from './error-handler';
import logger from './main-logger';

/**
 * Type definition for the settings store structure.
 */
interface SettingsStore {
  /** Current theme setting */
  theme: 'light' | 'dark' | 'system';
}

/**
 * Electron store instance for application settings.
 *
 * This store persists application settings across sessions
 * and provides a type-safe interface for setting management.
 */
const settingsStore = new Store<SettingsStore>({
  defaults: {
    theme: 'system',
  },
});

/**
 * IPC handler for getting the current theme setting.
 *
 * This handler retrieves the current theme setting from the store
 * and returns it to the renderer process.
 *
 * @returns Promise resolving to theme setting or error
 */
ipcMain.handle(
  'settings:getTheme',
  withErrorHandling(async () => {
    const theme = settingsStore.get('theme', 'system');
    logger.info('Theme setting read', { theme });
    return theme;
  }, 'settings:getTheme'),
);

/**
 * IPC handler for setting the theme.
 *
 * This handler updates the theme setting in the store and
 * logs the change for debugging purposes.
 *
 * @param _event - The IPC event object (unused)
 * @param theme - The new theme to set
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'settings:setTheme',
  withErrorHandling(async (_event, theme: 'light' | 'dark' | 'system') => {
    // Validate theme value
    const validation = validateInput(theme, 'string');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new Error('Invalid theme value');
    }

    settingsStore.set('theme', theme);
    logger.info('Theme setting updated', { theme });
    return { success: true };
  }, 'settings:setTheme'),
);

/**
 * IPC handler for clearing all settings and data.
 *
 * This handler removes all stored settings from the store,
 * effectively resetting the application to default values.
 *
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'settings:clear',
  withErrorHandling(async () => {
    settingsStore.clear();
    logger.info('All settings cleared');
    return { success: true };
  }, 'settings:clear'),
);

/**
 * IPC handler for exporting all settings and data.
 *
 * This handler exports all current settings as a JSON string
 * that can be saved to a file or transferred to another system.
 *
 * @returns Promise resolving to exported data or error
 */
ipcMain.handle(
  'settings:export',
  withErrorHandling(async () => {
    const data = settingsStore.store;
    logger.info('Settings exported');
    return JSON.stringify(data, null, 2);
  }, 'settings:export'),
);

/**
 * IPC handler for importing settings and data.
 *
 * This handler imports settings from a JSON string, typically
 * from a previously exported settings file. It validates the
 * data before applying it to the store.
 *
 * @param _event - The IPC event object (unused)
 * @param json - JSON string containing settings data
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'settings:import',
  withErrorHandling(async (_event, json: string) => {
    // Validate input
    const validation = validateInput(json, 'string');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data format');
    }

    settingsStore.store = data;
    logger.info('Settings imported');
    return { success: true };
  }, 'settings:import'),
);
