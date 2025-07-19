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
    };
  }
}
