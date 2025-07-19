/**
 * Exposes a secure IPC bridge for file operations and settings to the renderer process.
 *
 * This module provides a secure communication channel between the renderer
 * and main processes using Electron's contextBridge. It exposes only the
 * necessary APIs to prevent security vulnerabilities.
 *
 * @module preload
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure IPC bridge exposed to the renderer process.
 *
 * This object provides a safe interface for the renderer process to
 * communicate with the main process. It includes:
 * - File operations (read/write)
 * - Settings management (theme, data)
 *
 * All methods are validated and logged in the main process for security.
 *
 * @example
 * ```ts
 * // Read a file
 * const result = await window.api.readFile('/path/to/file.txt');
 *
 * // Set theme
 * await window.api.setTheme('dark');
 * ```
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Reads a file from the filesystem.
   *
   * @param filePath - Path to the file to read
   * @returns Promise resolving to file content or error
   */
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  /**
   * Writes data to a file in the filesystem.
   *
   * @param filePath - Path where to write the file
   * @param data - Data to write to the file
   * @returns Promise resolving to success status or error
   */
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),

  // Settings API

  /**
   * Gets the current theme setting from the main process.
   *
   * @returns Promise resolving to theme setting or error
   */
  getTheme: () => ipcRenderer.invoke('settings:getTheme'),

  /**
   * Sets the theme in the main process settings.
   *
   * @param theme - The theme to set ('light', 'dark', or 'system')
   * @returns Promise resolving to success status or error
   */
  setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.invoke('settings:setTheme', theme),

  /**
   * Clears all application settings and data.
   *
   * @returns Promise resolving to success status or error
   */
  clearSettings: () => ipcRenderer.invoke('settings:clear'),

  /**
   * Exports all application settings as JSON.
   *
   * @returns Promise resolving to exported data or error
   */
  exportSettings: () => ipcRenderer.invoke('settings:export'),

  /**
   * Imports application settings from JSON.
   *
   * @param json - JSON string containing settings data
   * @returns Promise resolving to success status or error
   */
  importSettings: (json: string) => ipcRenderer.invoke('settings:import', json),
});
