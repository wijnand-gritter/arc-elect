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
 * This handler retrieves the current theme from the settings store
 * and returns it to the renderer process. It includes timing
 * information for performance monitoring.
 *
 * @returns Promise resolving to theme setting or error
 */
ipcMain.handle('settings:getTheme', async () => {
  const startTime = Date.now();
  logger.info('IPC: getTheme called - START');

  try {
    const theme = settingsStore.get('theme', 'system');
    logger.info(`Theme setting read in ${Date.now() - startTime}ms:`, theme);
    return { success: true, theme };
  } catch (error) {
    logger.error(`Error reading theme setting in ${Date.now() - startTime}ms:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

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
ipcMain.handle('settings:setTheme', async (_event, theme: 'light' | 'dark' | 'system') => {
  try {
    settingsStore.set('theme', theme);
    logger.info('Theme setting updated', theme);
    return { success: true };
  } catch (error) {
    logger.error('Error updating theme setting:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * IPC handler for clearing all settings and data.
 *
 * This handler removes all stored settings from the store,
 * effectively resetting the application to default values.
 *
 * @returns Promise resolving to success status or error
 */
ipcMain.handle('settings:clear', async () => {
  try {
    settingsStore.clear();
    logger.info('All settings cleared');
    return { success: true };
  } catch (error) {
    logger.error('Error clearing settings:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * IPC handler for exporting all settings and data.
 *
 * This handler exports all current settings as a JSON string
 * that can be saved to a file or transferred to another system.
 *
 * @returns Promise resolving to exported data or error
 */
ipcMain.handle('settings:export', async () => {
  try {
    const data = settingsStore.store;
    logger.info('Settings exported');
    return { success: true, data: JSON.stringify(data, null, 2) };
  } catch (error) {
    logger.error('Error exporting settings:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

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
ipcMain.handle('settings:import', async (_event, json: string) => {
  try {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) throw new Error('Invalid data');
    settingsStore.store = data;
    logger.info('Settings imported');
    return { success: true };
  } catch (error) {
    logger.error('Error importing settings:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
