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
 * This handler retrieves the current theme setting from the store
 * and returns it to the renderer process.
 *
 * @returns Promise resolving to theme setting or error
 */
ipcMain.handle('settings:getTheme', async () => {
  const startTime = Date.now();
  
  try {
    const theme = settingsStore.get('theme', 'system');
    const duration = Date.now() - startTime;
    
    logger.info('Theme setting read successfully', { theme, duration });
    return { success: true, data: theme };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error reading theme setting', { error: errorMessage, duration });
    return { success: false, error: errorMessage };
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
  const startTime = Date.now();
  
  try {
    // Enhanced validation
    if (typeof theme !== 'string') {
      throw new Error('Theme must be a string');
    }
    
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new Error('Invalid theme value. Must be "light", "dark", or "system"');
    }

    settingsStore.set('theme', theme);
    const duration = Date.now() - startTime;
    
    logger.info('Theme setting updated successfully', { theme, duration });
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error updating theme setting', { theme, error: errorMessage, duration });
    return { success: false, error: errorMessage };
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
  const startTime = Date.now();
  
  try {
    settingsStore.clear();
    const duration = Date.now() - startTime;
    
    logger.info('All settings cleared successfully', { duration });
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error clearing settings', { error: errorMessage, duration });
    return { success: false, error: errorMessage };
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
  const startTime = Date.now();
  
  try {
    const data = settingsStore.store;
    const duration = Date.now() - startTime;
    
    logger.info('Settings exported successfully', { duration });
    return { success: true, data: JSON.stringify(data, null, 2) };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error exporting settings', { error: errorMessage, duration });
    return { success: false, error: errorMessage };
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
  const startTime = Date.now();
  
  try {
    // Enhanced validation
    if (typeof json !== 'string') {
      throw new Error('Input must be a string');
    }
    
    if (json.length === 0) {
      throw new Error('Input cannot be empty');
    }

    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data format - must be a valid JSON object');
    }

    settingsStore.store = data;
    const duration = Date.now() - startTime;
    
    logger.info('Settings imported successfully', { duration });
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Error importing settings', { error: errorMessage, duration });
    return { success: false, error: errorMessage };
  }
});
