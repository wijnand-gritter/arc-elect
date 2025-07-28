/**
 * Exposes a secure IPC bridge for file operations, settings, and project management to the renderer process.
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

// Listen for app shutdown events
ipcRenderer.on('app:before-quit', () => {
  // Dispatch a custom event that the renderer can listen to
  window.dispatchEvent(new CustomEvent('app:before-quit'));
});

/**
 * Secure IPC bridge exposed to the renderer process.
 *
 * This object provides a safe interface for the renderer process to
 * communicate with the main process. It includes:
 * - File operations (read/write)
 * - Settings management (theme, data)
 * - Project management (create, load, save)
 * - Schema operations (scan, read, validate)
 * - Dialog operations (folder selection)
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
 *
 * // Create project
 * const project = await window.api.createProject(config);
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

  // Project Management API

  /**
   * Creates a new project with the specified configuration.
   *
   * @param config - Project configuration
   * @returns Promise resolving to created project or error
   */
  createProject: (config: unknown) => ipcRenderer.invoke('project:create', config),

  /**
   * Loads a project from the specified path.
   *
   * @param projectPath - Path to the project directory
   * @returns Promise resolving to loaded project or error
   */
  loadProject: (projectPath: string) => ipcRenderer.invoke('project:load', projectPath),

  /**
   * Saves project configuration and state.
   *
   * @param project - Project to save
   * @returns Promise resolving to success status or error
   */
  saveProject: (project: unknown) => ipcRenderer.invoke('project:save', project),

  /**
   * Gets a list of recently opened projects.
   *
   * @returns Promise resolving to recent projects or error
   */
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),

  /**
   * Deletes a project from the recent projects list.
   *
   * @param projectId - ID of the project to delete
   * @returns Promise resolving to success status or error
   */
  deleteProject: (projectId: string) => ipcRenderer.invoke('project:delete', projectId),

  // File System Operations API

  /**
   * Scans a directory for files matching the pattern.
   *
   * @param dirPath - Directory path to scan
   * @param pattern - File pattern (e.g., "*.json")
   * @returns Promise resolving to found files or error
   */
  scanDirectory: (dirPath: string, pattern: string) =>
    ipcRenderer.invoke('fs:scan', dirPath, pattern),

  /**
   * Reads and parses a JSON schema file.
   *
   * @param filePath - Path to the schema file
   * @returns Promise resolving to parsed schema or error
   */
  readSchema: (filePath: string) => ipcRenderer.invoke('fs:readSchema', filePath),

  /**
   * Validates a JSON schema file.
   *
   * @param filePath - Path to the schema file
   * @returns Promise resolving to validation result or error
   */
  validateSchema: (filePath: string) => ipcRenderer.invoke('fs:validate', filePath),

  // Dialog Operations API

  /**
   * Shows a folder selection dialog.
   *
   * @param options - Dialog options
   * @returns Promise resolving to selected path or error
   */
  showFolderDialog: (options?: { title?: string; defaultPath?: string }) =>
    ipcRenderer.invoke('dialog:folder', options),
});
