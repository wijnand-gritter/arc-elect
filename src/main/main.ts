/**
 * Electron main process entrypoint.
 *
 * This file bootstraps the Electron application, creates windows, and sets up main process event listeners.
 * It handles application lifecycle, security, IPC communication, and development tools.
 *
 * @module main
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS,
} from 'electron-devtools-installer';
import fs from 'fs/promises';

import logger from './main-logger';
import './main-store';
import { performanceMonitor } from './performance-monitor';
import { withErrorHandling, validateInput } from './error-handler';
// Import project manager to initialize IPC handlers
import './project-manager';

// Fix ICU data issues on Windows by setting proper ICU data path
if (process.platform === 'win32') {
  // Set ICU data path for Windows to fix "Invalid file descriptor to ICU data received" error
  const icuDataPath = path.join(process.resourcesPath, 'icudtl.dat');
  process.env.ICU_DATA_FILE = icuDataPath;

  // Alternative approach: set ICU data directory
  const icuDataDir = path.join(process.resourcesPath);
  process.env.ICU_DATA = icuDataDir;

  logger.info('ICU data configuration for Windows', {
    icuDataFile: icuDataPath,
    icuDataDir: icuDataDir,
    resourcesPath: process.resourcesPath,
  });
}

/**
 * Generates a JSON Schema template based on the specified type.
 *
 * @param templateType - The type of template to generate ('basic', 'user', 'product', 'api')
 * @param schemaName - The name of the schema (used for title and description)
 * @returns The JSON Schema content as a string
 */
function getSchemaTemplate(templateType: string, schemaName: string): string {
  const baseSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: schemaName,
    description: `${schemaName} schema`,
  };

  switch (templateType) {
    case 'simple-object':
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
            },
            name: {
              type: 'string',
              description: 'Name of the item',
            },
            description: {
              type: 'string',
              description: 'Description of the item',
            },
            dateCreated: {
              type: 'string',
              description: 'Creation timestamp',
              format: 'date-time',
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      );

    case 'simple-array':
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'array',
          items: {
            type: 'string',
            description: 'Array item',
          },
          minItems: 0,
          uniqueItems: true,
          additionalProperties: false,
        },
        null,
        2,
      );

    case 'complex-object':
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier',
            },
            name: {
              type: 'string',
              description: 'Name of the item',
            },
            description: {
              type: 'string',
              description: 'Description of the item',
            },
            externalId: {
              type: 'string',
              description: 'External system identifier',
            },
            dateCreated: {
              type: 'string',
              description: 'Creation timestamp',
              format: 'date-time',
            },
            dateUpdated: {
              type: 'string',
              description: 'Last update timestamp',
              format: 'date-time',
            },
            status: {
              type: 'string',
              description: 'Current status',
              enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED'],
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      );

    case 'complex-array':
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Item identifier',
              },
              name: {
                type: 'string',
                description: 'Item name',
              },
              value: {
                type: 'number',
                description: 'Numeric value',
              },
              dateCreated: {
                type: 'string',
                description: 'Creation timestamp',
                format: 'date-time',
              },
            },
            additionalProperties: false,
          },
          minItems: 0,
          uniqueItems: false,
        },
        null,
        2,
      );

    case 'enum':
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'string',
          description: 'Enumeration of possible values',
          enum: ['OPTION_ONE', 'OPTION_TWO', 'OPTION_THREE', 'OPTION_FOUR'],
        },
        null,
        2,
      );

    case 'basic':
    default:
      return JSON.stringify(
        {
          ...baseSchema,
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        null,
        2,
      );
  }
}

/**
 * Validates and normalizes an absolute filesystem path.
 * Throws on invalid input. Returns the resolved absolute path.
 */
function validateAbsolutePath(
  inputPath: string,
  maxLength: number = 512,
): string {
  const inputValidation = validateInput(inputPath, 'string', maxLength);
  if (!inputValidation.valid) {
    throw new Error(inputValidation.error);
  }
  if (inputPath.includes('\0')) {
    throw new Error('Invalid path');
  }
  if (inputPath.startsWith('file://')) {
    throw new Error('Invalid path scheme');
  }
  const resolved = path.resolve(inputPath);
  if (!path.isAbsolute(resolved)) {
    throw new Error('Path must be absolute');
  }
  return resolved;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

logger.info('Main process gestart');
performanceMonitor.checkpoint('main-process-start');

/**
 * Single instance lock to prevent multiple app instances.
 * If another instance is already running, focus the existing window.
 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    logger.info('Second instance blocked, focusing existing window');
  });
}

/**
 * Block new window creation for security.
 * Prevents arbitrary window creation from renderer process.
 */
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    logger.warn('Blocked new window creation:', url);
    return { action: 'deny' };
  });
});

/**
 * Handle certificate errors in development mode.
 * In development, we allow self-signed certificates.
 * In production, certificate errors are rejected.
 */
app.on(
  'certificate-error',
  (event, _webContents, _url, _error, _certificate, callback) => {
    if (process.env.NODE_ENV === 'development') {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  },
);

/**
 * Handle renderer process crashes and unresponsiveness.
 * Logs the event for debugging purposes.
 */
app.on('render-process-gone', (_event, _webContents, details) => {
  logger.error('Render process gone:', details);
});

/**
 * Log application shutdown for debugging and monitoring.
 */
app.on('before-quit', () => {
  logger.info('Application shutting down');

  // Notify renderer process to save state
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:before-quit');
    }
  }
});

/**
 * IPC handler for reading files from the renderer process.
 *
 * @param _event - The IPC event object (unused)
 * @param filePath - The path to the file to read
 * @returns Promise resolving to file content or error
 */
ipcMain.handle(
  'file:read',
  withErrorHandling(async (_event, filePath: string) => {
    const safePath = validateAbsolutePath(filePath, 2048);
    const data = await fs.readFile(safePath, 'utf-8');
    return data;
  }, 'file:read'),
);

/**
 * IPC handler for writing files from the renderer process.
 *
 * @param _event - The IPC event object (unused)
 * @param filePath - The path where to write the file
 * @param data - The data to write to the file
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'file:write',
  withErrorHandling(async (_event, filePath: string, data: string) => {
    // Validate inputs
    const dataValidation = validateInput(data, 'string');
    if (!dataValidation.valid) {
      throw new Error(dataValidation.error);
    }

    const safePath = validateAbsolutePath(filePath, 2048);
    await fs.writeFile(safePath, data, 'utf-8');
    logger.info('File written successfully', {
      filePath: safePath,
      size: data.length,
    });
    return { success: true };
  }, 'file:write'),
);

/**
 * IPC handler for creating schema files from templates.
 *
 * @param _event - The IPC event object (unused)
 * @param filePath - The path where to create the schema file
 * @param templateType - The type of template to use ('basic', 'simple-object', 'simple-array', 'complex-object', 'complex-array', 'enum')
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'file:createSchema',
  withErrorHandling(
    async (_event, filePath: string, templateType: string = 'basic') => {
      // Validate inputs
      const templateValidation = validateInput(templateType, 'string', 50);
      if (!templateValidation.valid) {
        throw new Error(templateValidation.error);
      }

      let targetPath = validateAbsolutePath(filePath, 2048);
      // Ensure the file has .schema.json extension
      if (!targetPath.endsWith('.schema.json')) {
        targetPath = `${targetPath}.schema.json`;
      }

      // Get schema template based on type
      const schemaContent = getSchemaTemplate(
        templateType,
        path.basename(targetPath, '.schema.json'),
      );

      await fs.writeFile(targetPath, schemaContent, 'utf-8');
      logger.info('Schema file created successfully', {
        filePath: targetPath,
        templateType,
      });
      return { success: true, filePath: targetPath };
    },
    'file:createSchema',
  ),
);

/**
 * IPC handler for creating folders.
 *
 * @param _event - The IPC event object (unused)
 * @param folderPath - The path where to create the folder
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'file:createFolder',
  withErrorHandling(async (_event, folderPath: string) => {
    const safePath = validateAbsolutePath(folderPath, 2048);
    await fs.mkdir(safePath, { recursive: true });
    logger.info('Folder created successfully', { folderPath: safePath });
    return { success: true, folderPath: safePath };
  }, 'file:createFolder'),
);

/**
 * IPC handler for renaming files and folders.
 *
 * @param _event - The IPC event object (unused)
 * @param oldPath - The current path of the file/folder
 * @param newPath - The new path for the file/folder
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'file:rename',
  withErrorHandling(async (_event, oldPath: string, newPath: string) => {
    const safeOld = validateAbsolutePath(oldPath, 2048);
    const safeNew = validateAbsolutePath(newPath, 2048);
    await fs.rename(safeOld, safeNew);
    logger.info('File/folder renamed successfully', {
      oldPath: safeOld,
      newPath: safeNew,
    });
    return { success: true, oldPath: safeOld, newPath: safeNew };
  }, 'file:rename'),
);

/**
 * IPC handler for deleting files and folders.
 *
 * @param _event - The IPC event object (unused)
 * @param path - The path of the file/folder to delete
 * @returns Promise resolving to success status or error
 */
ipcMain.handle(
  'file:delete',
  withErrorHandling(async (_event, filePath: string) => {
    const safePath = validateAbsolutePath(filePath, 2048);
    await fs.rm(safePath, { recursive: true, force: true });
    logger.info('Path deleted successfully', { filePath: safePath });
    return { success: true, filePath: safePath };
  }, 'file:delete'),
);

/**
 * Creates the main application window.
 *
 * This function sets up the BrowserWindow with appropriate security settings,
 * loads the renderer process, and configures development tools.
 *
 * @returns Promise that resolves when the window is created
 */
const createWindow = async (): Promise<void> => {
  performanceMonitor.checkpoint('create-window-start');
  logger.info('Creating main window - START');

  const preloadPath = path.resolve(__dirname, 'preload.js');
  logger.info('Preload path resolved:', preloadPath);

  const windowStartTime = Date.now();
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '..', '..', 'build', 'icons', 'icon.png'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  logger.info(`BrowserWindow created in ${Date.now() - windowStartTime}ms`);

  /**
   * Handle renderer process responsiveness events.
   * Logs when the renderer becomes unresponsive or responsive again.
   */
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone:', details.reason);
  });
  mainWindow.webContents.on('unresponsive', () => {
    logger.warn('Renderer process became unresponsive');
  });
  mainWindow.webContents.on('responsive', () => {
    logger.info('Renderer process became responsive again');
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const loadStartTime = Date.now();
    logger.debug('Loading dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);

    const loadPromise = mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    await loadPromise;
    logger.debug(`Dev server loaded in ${Date.now() - loadStartTime}ms`);

    // Only open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      const devToolsStartTime = Date.now();
      mainWindow.webContents.openDevTools();
      logger.debug(`DevTools opened in ${Date.now() - devToolsStartTime}ms`);
    }

    // Install React DevTools in background (non-blocking) - only in development
    // Temporarily disabled for performance testing
    if (process.env.NODE_ENV === 'development') {
      const reactDevToolsStartTime = Date.now();
      logger.debug('Installing React DevTools - START');

      installExtension(REACT_DEVELOPER_TOOLS)
        .then(() => {
          const reactDevToolsTime = Date.now() - reactDevToolsStartTime;
          logger.debug(
            `React DevTools installed successfully in ${reactDevToolsTime}ms`,
          );
        })
        .catch((err) => {
          const reactDevToolsTime = Date.now() - reactDevToolsStartTime;
          logger.error(
            `Failed to install React DevTools in ${reactDevToolsTime}ms:`,
            err,
          );
        });

      // Install Redux DevTools
      const reduxDevToolsStartTime = Date.now();
      logger.debug('Installing Redux DevTools - START');
      installExtension(REDUX_DEVTOOLS)
        .then(() => {
          const reduxDevToolsTime = Date.now() - reduxDevToolsStartTime;
          logger.debug(
            `Redux DevTools installed successfully in ${reduxDevToolsTime}ms`,
          );
        })
        .catch((err) => {
          const reduxDevToolsTime = Date.now() - reduxDevToolsStartTime;
          logger.error(
            `Failed to install Redux DevTools in ${reduxDevToolsTime}ms:`,
            err,
          );
        });
    }
  } else {
    logger.debug('Loading production build');
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  performanceMonitor.checkpoint('create-window-complete');
  logger.info('Main window created - COMPLETE');
};

/**
 * Application ready event handler.
 *
 * This method is called when Electron has finished initialization
 * and is ready to create browser windows. Some APIs can only be
 * used after this event occurs.
 */
app.on('ready', async () => {
  performanceMonitor.checkpoint('app-ready');
  await createWindow();
  performanceMonitor.checkpoint('app-fully-loaded');
  performanceMonitor.summary();
});

/**
 * Handle window close events.
 *
 * Quit when all windows are closed, except on macOS. There, it's common
 * for applications and their menu bar to stay active until the user quits
 * explicitly with Cmd + Q.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle app activation events (macOS).
 *
 * On OS X it's common to re-create a window in the app when the
 * dock icon is clicked and there are no other windows open.
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
