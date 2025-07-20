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
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import fs from 'fs/promises';

import logger from './main-logger';
import './main-store';
import { performanceMonitor } from './performance-monitor';

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
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  if (process.env.NODE_ENV === 'development') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

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
});

/**
 * IPC handler for reading files from the renderer process.
 *
 * @param _event - The IPC event object (unused)
 * @param filePath - The path to the file to read
 * @returns Promise resolving to file content or error
 */
ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    // Basic validation: only allow reading from user documents or a safe directory
    // (Pas dit aan naar je eigen security-beleid)
    if (typeof filePath !== 'string' || filePath.length > 512) {
      throw new Error('Invalid file path');
    }
    const data = await fs.readFile(filePath, 'utf-8');
    logger.info('File read', filePath);
    return { success: true, data };
  } catch (error) {
    logger.error('Error reading file:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * IPC handler for writing files from the renderer process.
 *
 * @param _event - The IPC event object (unused)
 * @param filePath - The path where to write the file
 * @param data - The data to write to the file
 * @returns Promise resolving to success status or error
 */
ipcMain.handle('file:write', async (_event, filePath: string, data: string) => {
  try {
    if (typeof filePath !== 'string' || filePath.length > 512) {
      throw new Error('Invalid file path');
    }
    if (typeof data !== 'string') {
      throw new Error('Invalid file data');
    }
    await fs.writeFile(filePath, data, 'utf-8');
    logger.info('File written', filePath);
    return { success: true };
  } catch (error) {
    logger.error('Error writing file:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

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
    icon: path.join(__dirname, '..', '..', 'build', 'icons', 'icon.png'), // Linux icon
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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
          logger.debug(`React DevTools installed successfully in ${reactDevToolsTime}ms`);
        })
        .catch((err) => {
          const reactDevToolsTime = Date.now() - reactDevToolsStartTime;
          logger.error(`Failed to install React DevTools in ${reactDevToolsTime}ms:`, err);
        });
    }
  } else {
    logger.debug('Loading production build');
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
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
