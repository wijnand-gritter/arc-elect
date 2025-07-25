/**
 * TypeScript declaration for the secure IPC bridge exposed in the preload script.
 *
 * This module defines the TypeScript types for the `window.api` object
 * that provides secure communication between the renderer and main processes.
 * All IPC methods are validated and logged in the main process for security.
 *
 * @module ipc-api
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import type { Project, ProjectConfig, Schema, ValidationResult } from './schema-editor';

export {};

/**
 * Global window interface extension for the IPC API.
 *
 * This interface extends the global Window interface to include
 * the secure IPC bridge that provides communication with the main process.
 */
declare global {
  interface Window {
    /**
     * Secure IPC bridge for communication with the main process.
     *
     * This object provides a safe interface for the renderer process to
     * communicate with the main process. All methods are validated and
     * logged in the main process for security.
     */
    api: {
      // File system operations
      /**
       * Reads a file from the filesystem.
       *
       * @param filePath - Path to the file to read
       * @returns Promise resolving to file content or error
       */
      readFile: (filePath: string) => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;

      /**
       * Writes data to a file in the filesystem.
       *
       * @param filePath - Path where to write the file
       * @param data - Data to write to the file
       * @returns Promise resolving to success status or error
       */
      writeFile: (
        filePath: string,
        data: string,
      ) => Promise<{
        success: boolean;
        error?: string;
      }>;

      // Theme management
      /**
       * Gets the current theme setting from the main process.
       *
       * @returns Promise resolving to theme setting or error
       */
      getTheme: () => Promise<{
        success: boolean;
        theme?: 'light' | 'dark' | 'system';
        error?: string;
      }>;

      /**
       * Sets the theme in the main process settings.
       *
       * @param theme - The theme to set ('light', 'dark', or 'system')
       * @returns Promise resolving to success status or error
       */
      setTheme: (
        theme: 'light' | 'dark' | 'system',
      ) => Promise<{ success: boolean; error?: string }>;

      // Settings management
      /**
       * Clears all application settings and data.
       *
       * @returns Promise resolving to success status or error
       */
      clearSettings: () => Promise<{ success: boolean; error?: string }>;

      /**
       * Exports all application settings as JSON.
       *
       * @returns Promise resolving to exported data or error
       */
      exportSettings: () => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;

      /**
       * Imports application settings from JSON.
       *
       * @param json - JSON string containing settings data
       * @returns Promise resolving to success status or error
       */
      importSettings: (json: string) => Promise<{ success: boolean; error?: string }>;

      // Project management
      /**
       * Creates a new project with the specified configuration.
       *
       * @param config - Project configuration
       * @returns Promise resolving to created project or error
       */
      createProject: (config: ProjectConfig) => Promise<{
        success: boolean;
        project?: Project;
        error?: string;
      }>;

      /**
       * Loads a project from the specified path.
       *
       * @param projectPath - Path to the project directory
       * @returns Promise resolving to loaded project or error
       */
      loadProject: (projectPath: string) => Promise<{
        success: boolean;
        project?: Project;
        error?: string;
      }>;

      /**
       * Saves project configuration and state.
       *
       * @param project - Project to save
       * @returns Promise resolving to success status or error
       */
      saveProject: (project: Project) => Promise<{
        success: boolean;
        error?: string;
      }>;

      /**
       * Gets a list of recently opened projects.
       *
       * @returns Promise resolving to recent projects or error
       */
      getRecentProjects: () => Promise<{
        success: boolean;
        projects?: Project[];
        error?: string;
      }>;

      // File system operations for schemas
      /**
       * Scans a directory for schema files matching the pattern.
       *
       * @param path - Directory path to scan
       * @param pattern - File pattern (e.g., "*.json")
       * @returns Promise resolving to found files or error
       */
      scanDirectory: (
        path: string,
        pattern: string,
      ) => Promise<{
        success: boolean;
        files?: string[];
        error?: string;
      }>;

      /**
       * Reads and parses a JSON schema file.
       *
       * @param filePath - Path to the schema file
       * @returns Promise resolving to parsed schema or error
       */
      readSchema: (filePath: string) => Promise<{
        success: boolean;
        schema?: Schema;
        error?: string;
      }>;

      /**
       * Validates a JSON schema file.
       *
       * @param filePath - Path to the schema file
       * @returns Promise resolving to validation result or error
       */
      validateSchema: (filePath: string) => Promise<{
        success: boolean;
        result?: ValidationResult;
        error?: string;
      }>;

      /**
       * Watches a directory for file changes.
       *
       * @param path - Directory path to watch
       * @returns Promise resolving to success status or error
       */
      watchDirectory: (path: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      /**
       * Stops watching a directory for file changes.
       *
       * @param path - Directory path to stop watching
       * @returns Promise resolving to success status or error
       */
      unwatchDirectory: (path: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      // Dialog operations
      /**
       * Shows a folder selection dialog.
       *
       * @param options - Dialog options
       * @returns Promise resolving to selected path or error
       */
      showFolderDialog: (options?: { title?: string; defaultPath?: string }) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;

      /**
       * Shows a file selection dialog.
       *
       * @param options - Dialog options
       * @returns Promise resolving to selected files or error
       */
      showFileDialog: (options?: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        multiSelections?: boolean;
      }) => Promise<{
        success: boolean;
        paths?: string[];
        error?: string;
      }>;
    };
  }
}
