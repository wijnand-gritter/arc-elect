/**
 * Project management module for Arc Elect JSON Schema Editor.
 *
 * This module handles project creation, loading, saving, and file system operations
 * for JSON schema projects. It provides secure IPC handlers for project management.
 *
 * @module project-manager
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { watch } from 'chokidar';
import logger from './main-logger';
import { convertRamlToJsonSchemas } from './raml-converter';
import type {
  Project,
  ProjectConfig,
  Schema,
  ValidationResult,
  SchemaReference,
} from '../types/schema-editor';
import type { RamlFileInfo } from '../types/raml-import';

/**
 * RAML conversion options interface.
 */
interface RamlConversionOptions {
  preserveStructure: boolean;
  generateExamples: boolean;
  includeAnnotations: boolean;
  namingConvention: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';
  validateOutput: boolean;
}

/**
 * RAML batch conversion parameters.
 */
interface RamlBatchConversionParams {
  sourceDirectory: string;
  destinationDirectory: string;
  options: RamlConversionOptions;
  progressCallback?: (progress: {
    current: number;
    total: number;
    currentFile: string;
    phase: string;
  }) => void;
}

/**
 * RAML batch conversion result interface.
 */
interface RamlBatchConversionResult {
  success: boolean;
  results: unknown[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
  };
  error?: string;
}

/**
 * JSON Schema validator instance.
 */
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

/**
 * Project manager class for handling project operations.
 */
class ProjectManager {
  private projects = new Map<string, Project>();
  private watchers = new Map<string, ReturnType<typeof watch>>();

  constructor() {
    this.setupIpcHandlers();
  }

  /**
   * Sets up IPC handlers for project management.
   */
  private setupIpcHandlers(): void {
    // Project creation
    ipcMain.handle('project:create', async (_event, config: ProjectConfig) => {
      return this.createProject(config);
    });

    // Project loading
    ipcMain.handle('project:load', async (_event, projectPath: string) => {
      return this.loadProject(projectPath);
    });

    // Project saving
    ipcMain.handle('project:save', async (_event, project: Project) => {
      return this.saveProject(project);
    });

    // Get recent projects
    ipcMain.handle('project:getRecent', async () => {
      return this.getRecentProjects();
    });

    // Delete project
    ipcMain.handle('project:delete', async (_event, projectId: string) => {
      return this.deleteProject(projectId);
    });

    // Directory scanning
    ipcMain.handle('fs:scan', async (_event, dirPath: string, pattern: string) => {
      return this.scanDirectory(dirPath, pattern);
    });

    // Schema reading
    ipcMain.handle('fs:readSchema', async (_event, filePath: string) => {
      return this.readSchema(filePath);
    });

    // Schema validation
    ipcMain.handle('fs:validate', async (_event, filePath: string) => {
      return this.validateSchema(filePath);
    });

    // Folder dialog
    ipcMain.handle('dialog:selectFolder', async (_event, title: string) => {
      const result = await this.showFolderDialog({ title });
      return {
        success: result.success,
        data: result.path,
        error: result.error,
      };
    });

    // Destination folder dialog (allows creating new folders)
    ipcMain.handle('dialog:selectDestinationFolder', async (_event, title: string) => {
      const result = await this.showDestinationFolderDialog({ title });
      return {
        success: result.success,
        data: result.path,
        error: result.error,
      };
    });

    // Create directory
    ipcMain.handle('fs:createDirectory', async (_event, dirPath: string) => {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create directory',
        };
      }
    });

    // RAML import handlers
    ipcMain.handle('raml:scan', async (_event, directoryPath: string) => {
      try {
        const files = await this.scanRamlFiles(directoryPath);
        return { success: true, data: files };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to scan RAML files',
        };
      }
    });

    ipcMain.handle('raml:convertBatch', async (_event, options: RamlBatchConversionParams) => {
      return this.convertRamlBatch(options);
    });

    ipcMain.handle('raml:clearDirectory', async (_event, directoryPath: string) => {
      try {
        await this.clearDirectory(directoryPath);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear directory',
        };
      }
    });

    // Project cache management
    ipcMain.handle('project:clearCache', async (_event, projectId?: string) => {
      try {
        this.clearProjectCache(projectId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear project cache',
        };
      }
    });

    // Force reload project
    ipcMain.handle('project:forceReload', async (_event, projectPath: string) => {
      return this.loadProject(projectPath, true);
    });

    ipcMain.handle('raml:validateSchemas', async (_event, directoryPath: string) => {
      try {
        const isValid = await this.validateSchemasInDirectory(directoryPath);
        return { success: isValid };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate schemas',
        };
      }
    });

    ipcMain.handle('raml:cancel', async () => {
      // Placeholder for cancellation logic
      return { success: true };
    });
  }

  /**
   * Creates a new project with the specified configuration.
   */
  private async createProject(config: ProjectConfig): Promise<{
    success: boolean;
    project?: Project;
    error?: string;
  }> {
    const startTime = Date.now();
    logger.info('ProjectManager: Creating project - START', { config });

    try {
      // Validate project path
      if (!config.path || !config.name) {
        return { success: false, error: 'Invalid project configuration' };
      }

      // Check if directory exists
      try {
        await fs.access(config.path);
      } catch {
        return { success: false, error: 'Project directory does not exist' };
      }

      // Scan for JSON files
      const jsonFiles = await this.scanDirectoryForJsonFiles(config.path);

      // Create project object
      const project: Project = {
        id: this.generateProjectId(config.path),
        name: config.name,
        path: config.path,
        schemaPattern: config.schemaPattern || '*.json',
        createdAt: new Date(),
        lastModified: new Date(),
        status: {
          isLoaded: false,
          isLoading: true,
          totalSchemas: jsonFiles.length,
          validSchemas: 0,
          invalidSchemas: 0,
          lastScanTime: new Date(),
        },
        settings: {
          autoValidate: config.settings?.autoValidate ?? true,
          watchForChanges: config.settings?.watchForChanges ?? true,
          maxFileSize: config.settings?.maxFileSize ?? 10 * 1024 * 1024,
          allowedExtensions: config.settings?.allowedExtensions ?? ['.json'],
        },
        schemaIds: [],
        schemas: [],
      };

      // Store project in map BEFORE reading schemas so readSchemaFile can find it
      this.projects.set(project.id, project);

      // Load and validate schemas in parallel with progress tracking
      const schemaLoadStart = Date.now();
      logger.info('ProjectManager: Loading schemas', { totalFiles: jsonFiles.length });

      const schemaPromises = jsonFiles.map(async (filePath, index) => {
        try {
          const schema = await this.readSchemaFile(filePath, project.id);
          // Log progress every 50 schemas to reduce logging overhead
          if (index % 50 === 0 && index > 0) {
            logger.info(`ProjectManager: Loaded ${index}/${jsonFiles.length} schemas`);
          }
          return schema;
        } catch (error) {
          logger.warn('Failed to read schema file', { filePath, error });
          return null;
        }
      });

      const schemaResults = await Promise.all(schemaPromises);
      const schemas = schemaResults.filter((schema): schema is Schema => schema !== null);

      const schemaLoadDuration = Date.now() - schemaLoadStart;
      logger.info(`ProjectManager: Schemas loaded in ${schemaLoadDuration}ms`, {
        loaded: schemas.length,
        failed: jsonFiles.length - schemas.length,
      });

      let validCount = 0;
      let invalidCount = 0;
      schemas.forEach((schema) => {
        if (schema.validationStatus === 'valid') {
          validCount++;
        } else {
          invalidCount++;
        }
      });

      // Update project with schema data
      project.schemaIds = schemas.map((s) => s.id);
      project.schemas = schemas;
      project.status.validSchemas = validCount;
      project.status.invalidSchemas = invalidCount;
      project.status.isLoaded = true;
      project.status.isLoading = false;

      // Resolve references between schemas
      const refResolutionStart = Date.now();
      this.resolveSchemaReferences(schemas);
      const refResolutionDuration = Date.now() - refResolutionStart;
      logger.info(`ProjectManager: Reference resolution completed in ${refResolutionDuration}ms`);

      // Project already stored before schema loading

      // Save project metadata to persist user-provided name
      await this.saveProjectMetadata(project);

      // Set up file watching
      const watchSetupStart = Date.now();
      await this.setupProjectWatching(project);
      const watchSetupDuration = Date.now() - watchSetupStart;
      logger.info(`ProjectManager: File watching setup completed in ${watchSetupDuration}ms`);

      logger.info(`ProjectManager: Project created in ${Date.now() - startTime}ms`, {
        projectId: project.id,
        schemaCount: schemas.length,
      });

      return { success: true, project };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to create project', { error });
      return { success: false, error: `Failed to create project: ${errorMessage}` };
    }
  }

  /**
   * Loads a project from the specified path.
   */
  private async loadProject(projectPath: string, forceReload = false): Promise<{
    success: boolean;
    project?: Project;
    error?: string;
  }> {
    logger.info('ProjectManager: Loading project - START', { projectPath, forceReload });

    try {
      // Check if directory exists
      try {
        await fs.access(projectPath);
      } catch {
        return { success: false, error: 'Project directory does not exist' };
      }

      // Check if project is already loaded (unless force reload is requested)
      const projectId = this.generateProjectId(projectPath);
      const existingProject = this.projects.get(projectId);
      if (existingProject && !forceReload) {
        logger.info('ProjectManager: Project already loaded', { projectId });
        return { success: true, project: existingProject };
      }

      // If force reload, remove the existing project from cache
      if (forceReload && existingProject) {
        this.projects.delete(projectId);
        logger.info('ProjectManager: Removed project from cache for force reload', { projectId });
      }

      // Load project metadata if it exists
      const savedMetadata = await this.loadProjectMetadata(projectPath);

      // Create project config from path and metadata
      const config: ProjectConfig = {
        name: savedMetadata?.name || path.basename(projectPath),
        path: projectPath,
        schemaPattern: savedMetadata?.schemaPattern || '*.json',
        settings: savedMetadata?.settings || {
          autoValidate: true,
          watchForChanges: true,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedExtensions: ['.json'],
        },
      };

      // Create project (reuse createProject logic)
      return await this.createProject(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to load project', { error });
      return { success: false, error: `Failed to load project: ${errorMessage}` };
    }
  }

  /**
   * Saves project configuration and state.
   */
  private async saveProject(project: Project): Promise<{
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    logger.info('ProjectManager: Saving project - START', { projectId: project.id });

    try {
      // Update last modified time
      project.lastModified = new Date();

      // Store project
      this.projects.set(project.id, project);

      logger.info(`ProjectManager: Project saved in ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to save project', { error });
      return { success: false, error: `Failed to save project: ${errorMessage}` };
    }
  }

  /**
   * Gets a list of recently opened projects.
   */
  private async getRecentProjects(): Promise<{
    success: boolean;
    projects?: Project[];
    error?: string;
  }> {
    try {
      const userDataPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.arc-elect',
      );
      const projectsDir = path.join(userDataPath, 'projects');

      // Ensure the directory exists
      await fs.mkdir(projectsDir, { recursive: true });

      const projectFiles = await fs.readdir(projectsDir);
      const projects: Project[] = [];

      for (const file of projectFiles) {
        if (file.endsWith('.json')) {
          try {
            const metadataPath = path.join(projectsDir, file);
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);

            // Check if the project directory still exists
            try {
              await fs.access(metadata.path);

              // Create a Project object from the metadata
              const project: Project = {
                id: metadata.id,
                name: metadata.name,
                path: metadata.path,
                schemaPattern: metadata.schemaPattern || '*.json',
                createdAt: new Date(metadata.createdAt),
                lastModified: new Date(metadata.lastModified || metadata.createdAt),
                settings: metadata.settings || {
                  autoValidate: true,
                  watchForChanges: true,
                  maxFileSize: 10 * 1024 * 1024,
                  allowedExtensions: ['.json'],
                },
                schemas: [], // Will be loaded when project is opened
              };

              projects.push(project);
            } catch {
              // Project directory doesn't exist anymore, skip it
              logger.debug('ProjectManager: Project directory no longer exists', {
                path: metadata.path,
              });
            }
          } catch (error) {
            logger.warn('ProjectManager: Failed to load project metadata', { file, error });
          }
        }
      }

      // Sort by last modified and return top 10
      const sortedProjects = projects
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .slice(0, 10);

      return { success: true, projects: sortedProjects };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to get recent projects', { error });
      return { success: false, error: `Failed to get recent projects: ${errorMessage}` };
    }
  }

  /**
   * Deletes a project from the recent projects list.
   */
  private async deleteProject(projectId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    logger.info('ProjectManager: Deleting project - START', { projectId });

    try {
      // Check if project exists
      if (!this.projects.has(projectId)) {
        return { success: false, error: 'Project not found' };
      }

      const project = this.projects.get(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Stop watching the project directory if it's being watched
      if (this.watchers.has(projectId)) {
        const watcher = this.watchers.get(projectId);
        if (watcher) {
          watcher.close();
          this.watchers.delete(projectId);
        }
      }

      // Remove project from the projects map
      this.projects.delete(projectId);

      // Delete project metadata file
      await this.deleteProjectMetadata(project.path);

      logger.info(`ProjectManager: Project deleted in ${Date.now() - startTime}ms`, { projectId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to delete project', { projectId, error });
      return { success: false, error: `Failed to delete project: ${errorMessage}` };
    }
  }

  /**
   * Saves project metadata to the user's home directory.
   */
  private async saveProjectMetadata(project: Project): Promise<void> {
    try {
      const userDataPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.arc-elect',
      );
      const projectsDir = path.join(userDataPath, 'projects');
      const metadataPath = path.join(projectsDir, `${project.id}.json`);

      // Ensure the directory exists
      await fs.mkdir(projectsDir, { recursive: true });

      const metadata = {
        id: project.id,
        name: project.name,
        path: project.path,
        schemaPattern: project.schemaPattern,
        createdAt: project.createdAt.toISOString(),
        lastModified: project.lastModified.toISOString(),
        settings: project.settings,
        version: '1.0.0',
      };

      logger.info('ProjectManager: Saving project metadata', {
        projectPath: project.path,
        projectName: project.name,
        projectId: project.id,
        metadataPath,
      });

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      logger.info('ProjectManager: Project metadata saved successfully', {
        projectPath: project.path,
        metadataPath,
      });
    } catch (error) {
      logger.error('ProjectManager: Failed to save project metadata', {
        projectPath: project.path,
        error,
      });
      // Don't throw error - metadata saving is not critical
    }
  }

  /**
   * Loads project metadata from the user's home directory.
   */
  private async loadProjectMetadata(projectPath: string): Promise<{
    name?: string;
    schemaPattern?: string;
    createdAt?: Date;
    settings?: Project['settings'];
  } | null> {
    try {
      const userDataPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.arc-elect',
      );
      const projectsDir = path.join(userDataPath, 'projects');

      // Try to find the metadata file by scanning all project files
      const projectFiles = await fs.readdir(projectsDir);

      for (const file of projectFiles) {
        if (file.endsWith('.json')) {
          const metadataPath = path.join(projectsDir, file);
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);

          // Check if this metadata file corresponds to the project path
          if (metadata.path === projectPath) {
            const result: {
              name?: string;
              schemaPattern?: string;
              createdAt?: Date;
              settings?: Project['settings'];
            } = {};

            if (metadata.name) result.name = metadata.name;
            if (metadata.schemaPattern) result.schemaPattern = metadata.schemaPattern;
            if (metadata.createdAt) result.createdAt = new Date(metadata.createdAt);
            if (metadata.settings) result.settings = metadata.settings;

            return result;
          }
        }
      }

      return null;
    } catch (_error) {
      // Metadata file doesn't exist or is invalid - return null
      logger.debug('ProjectManager: No project metadata found', { projectPath });
      return null;
    }
  }

  /**
   * Deletes project metadata file from the user's home directory.
   */
  private async deleteProjectMetadata(projectPath: string): Promise<void> {
    try {
      const userDataPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        '.arc-elect',
      );
      const projectsDir = path.join(userDataPath, 'projects');

      // Try to find and delete the metadata file
      const projectFiles = await fs.readdir(projectsDir);

      for (const file of projectFiles) {
        if (file.endsWith('.json')) {
          const metadataPath = path.join(projectsDir, file);
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);

          // Check if this metadata file corresponds to the project path
          if (metadata.path === projectPath) {
            await fs.unlink(metadataPath);
            logger.info('ProjectManager: Project metadata deleted', { projectPath, metadataPath });
            return;
          }
        }
      }

      logger.debug('ProjectManager: No project metadata to delete', { projectPath });
    } catch (_error) {
      // Metadata file might not exist - don't throw error
      logger.debug('ProjectManager: No project metadata to delete', { projectPath });
    }
  }

  /**
   * Scans a directory for files matching the pattern.
   */
  private async scanDirectory(
    dirPath: string,
    pattern: string,
  ): Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }> {
    try {
      // Simple implementation for JSON files only
      if (pattern === '*.json') {
        const files = await this.scanDirectoryForJsonFiles(dirPath);
        return { success: true, files };
      }

      // For other patterns, return empty array for now
      return { success: true, files: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to scan directory', { dirPath, error });
      return { success: false, error: `Failed to scan directory: ${errorMessage}` };
    }
  }

  /**
   * Reads and parses a JSON schema file.
   */
  private async readSchema(filePath: string): Promise<{
    success: boolean;
    schema?: Schema;
    error?: string;
  }> {
    try {
      // Generate a temporary project ID for standalone schema reading
      const tempProjectId = 'temp-' + this.generateProjectId(path.dirname(filePath));
      const schema = await this.readSchemaFile(filePath, tempProjectId);
      return schema ? { success: true, schema } : { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to read schema', { filePath, error });
      return { success: false, error: `Failed to read schema: ${errorMessage}` };
    }
  }

  /**
   * Validates a schema file (optimized with single file read).
   */
  private async validateSchema(filePath: string): Promise<{
    success: boolean;
    result?: ValidationResult;
    error?: string;
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        const result: ValidationResult = {
          isValid: false,
          errors: [
            {
              path: '',
              instancePath: '',
              message: parseError instanceof Error ? parseError.message : 'Failed to parse JSON',
              keyword: 'parse',
              severity: 'error',
            },
          ],
          warnings: [],
          duration: 0,
          timestamp: new Date(),
        };
        return { success: true, result };
      }

      const result = this.validateSchemaData(data);
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to validate schema', { filePath, error });
      return { success: false, error: `Failed to validate schema: ${errorMessage}` };
    }
  }

  /**
   * Shows a folder selection dialog.
   */
  private async showFolderDialog(options?: { title?: string; defaultPath?: string }): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const result = await dialog.showOpenDialog({
        title: options?.title || 'Select Folder',
        ...(options?.defaultPath && { defaultPath: options.defaultPath }),
        properties: ['openDirectory'],
      });

      // Handle both old and new dialog result formats
      if (Array.isArray(result)) {
        // Old format: returns string[]
        if (result.length === 0) {
          return { success: false, error: 'No folder selected' };
        }
        return { success: true, path: result[0] };
      } else {
        // New format: returns OpenDialogReturnValue
        const dialogResult = result as Electron.OpenDialogReturnValue;
        if (dialogResult.canceled) {
          return { success: false, error: 'Dialog cancelled' };
        }
        return { success: true, path: dialogResult.filePaths[0] };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to show folder dialog', { error });
      return { success: false, error: `Failed to show folder dialog: ${errorMessage}` };
    }
  }

  /**
   * Shows a folder selection dialog that allows creating new folders.
   */
  private async showDestinationFolderDialog(options?: {
    title?: string;
    defaultPath?: string;
  }): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const result = await dialog.showOpenDialog({
        title: options?.title || 'Select Destination Folder',
        ...(options?.defaultPath && { defaultPath: options.defaultPath }),
        properties: ['openDirectory', 'createDirectory'],
      });

      // Handle both old and new dialog result formats
      if (Array.isArray(result)) {
        // Old format: returns string[]
        if (result.length === 0) {
          return { success: false, error: 'No folder selected' };
        }
        return { success: true, path: result[0] };
      } else {
        // New format: returns OpenDialogReturnValue
        const dialogResult = result as Electron.OpenDialogReturnValue;
        if (dialogResult.canceled) {
          return { success: false, error: 'Dialog cancelled' };
        }
        return { success: true, path: dialogResult.filePaths[0] };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to show destination folder dialog', { error });
      return { success: false, error: `Failed to show destination folder dialog: ${errorMessage}` };
    }
  }

  /**
   * Scans directory for JSON files.
   */
  private async scanDirectoryForJsonFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await glob('**/*.json', {
        cwd: dirPath,
        absolute: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/package-lock.json', '**/package.json'],
      });
      return files;
    } catch (error) {
      logger.error('Failed to scan directory for JSON files', { dirPath, error });
      return [];
    }
  }

  /**
   * Reads and parses a schema file with optimized single-pass processing.
   */
  private async readSchemaFile(filePath: string, projectId: string): Promise<Schema | null> {
    // Get project to access project root path
    const project = this.projects.get(projectId);
    const projectRootPath = project?.path || path.dirname(filePath);
    const relativePath = path.relative(projectRootPath, filePath);

    // Path calculation should now work correctly with project in map
    try {
      // Single file read and stat operation
      const [content, stats] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath),
      ]);

      // Single JSON parse
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        return {
          id: this.generateSchemaId(filePath),
          projectId,
          name: path.basename(filePath, '.schema.json'),
          path: filePath,
          content: {},
          metadata: {
            lastModified: stats.mtime,
            fileSize: stats.size,
          },
          validationStatus: 'invalid',
          validationErrors: [
            {
              path: '',
              instancePath: '',
              message: parseError instanceof Error ? parseError.message : 'Failed to parse JSON',
              keyword: 'parse',
              severity: 'error',
            },
          ],
          relativePath,
          importSource: 'json',
          importDate: new Date(),
          references: [],
          referencedBy: [],
        };
      }

      // Inline validation (no separate file read)
      const validationResult = this.validateSchemaData(data);

      const schema: Schema = {
        id: this.generateSchemaId(filePath),
        projectId,
        name: path.basename(filePath, '.schema.json'),
        path: filePath,
        content: data as Record<string, unknown>,
        metadata: {
          ...this.extractMetadata(data),
          lastModified: stats.mtime,
          fileSize: stats.size,
        },
        validationStatus: validationResult.isValid ? 'valid' : 'invalid',
        ...(validationResult.errors &&
          validationResult.errors.length > 0 && { validationErrors: validationResult.errors }),
        relativePath,
        importSource: 'json',
        importDate: new Date(),
        references: this.extractReferences(data),
        referencedBy: [],
      };

      return schema;
    } catch (error) {
      logger.warn('Failed to read schema file', { filePath, error });
      return null;
    }
  }

  /**
   * Validates already-parsed schema data (optimized - no file I/O).
   */
  private validateSchemaData(data: unknown): ValidationResult {
    // Validate basic JSON Schema structure
    const errors: Array<{
      path: string;
      instancePath: string;
      message: string;
      keyword: string;
      severity: 'error';
    }> = [];

    // Cast data to record for property access
    const dataRecord = data as Record<string, unknown>;

    // Check if it's a valid JSON object
    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: '',
        instancePath: '',
        message: 'Schema must be a JSON object',
        keyword: 'type',
        severity: 'error',
      });
    } else {
      // Only flag obvious structural errors
      // Most JSON objects can be valid schemas, so be very permissive

      // Check for invalid $schema format (should be a string if present)
      if (dataRecord.$schema !== undefined && typeof dataRecord.$schema !== 'string') {
        errors.push({
          path: '/$schema',
          instancePath: '/$schema',
          message: '$schema must be a string',
          keyword: 'type',
          severity: 'error',
        });
      }

      // Check for invalid type format (should be string or array if present)
      if (
        dataRecord.type !== undefined &&
        typeof dataRecord.type !== 'string' &&
        !Array.isArray(dataRecord.type)
      ) {
        errors.push({
          path: '/type',
          instancePath: '/type',
          message: 'type must be a string or array of strings',
          keyword: 'type',
          severity: 'error',
        });
      }

      // Check for invalid properties format (should be object if present)
      if (
        dataRecord.properties !== undefined &&
        (typeof dataRecord.properties !== 'object' || dataRecord.properties === null)
      ) {
        errors.push({
          path: '/properties',
          instancePath: '/properties',
          message: 'properties must be an object',
          keyword: 'type',
          severity: 'error',
        });
      }

      // Check for invalid enum format (should be array if present)
      if (dataRecord.enum !== undefined && !Array.isArray(dataRecord.enum)) {
        errors.push({
          path: '/enum',
          instancePath: '/enum',
          message: 'enum must be an array',
          keyword: 'type',
          severity: 'error',
        });
      }

      // Check for invalid $ref format (should be string if present)
      if (dataRecord.$ref !== undefined && typeof dataRecord.$ref !== 'string') {
        errors.push({
          path: '/$ref',
          instancePath: '/$ref',
          message: '$ref must be a string',
          keyword: 'type',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Resolves references between schemas and populates referencedBy fields (optimized).
   */
  private resolveSchemaReferences(schemas: Schema[]): void {
    const startTime = Date.now();

    // Pre-allocate referencedBy arrays and create lookup map in single pass
    const schemaMap = new Map<string, Schema>();
    const referencedByMap = new Map<string, Set<string>>();

    schemas.forEach((schema) => {
      // Initialize referencedBy tracking
      referencedByMap.set(schema.id, new Set());

      // Build lookup map with all possible name variations
      schemaMap.set(schema.name, schema);
      schemaMap.set(schema.relativePath, schema);

      // Filename without extension
      const filename = path.basename(schema.relativePath, path.extname(schema.relativePath));
      schemaMap.set(filename, schema);

      // Schema name without .schema suffix (backward compatibility)
      if (schema.name.endsWith('.schema')) {
        schemaMap.set(schema.name.replace('.schema', ''), schema);
      }

      // Add variations for schema names with .schema.json extension
      if (schema.name.endsWith('.schema.json')) {
        const nameWithoutExt = schema.name.replace('.schema.json', '');
        schemaMap.set(nameWithoutExt, schema);
      }

      // Add the full path as a key for better matching
      schemaMap.set(schema.relativePath, schema);
    });

    // Process references efficiently
    let totalReferences = 0;
    let resolvedReferences = 0;
    let unresolvedReferences = 0;

    // Debug: Log schema map keys for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Schema map keys:', Array.from(schemaMap.keys()));
    }

    schemas.forEach((schema) => {
      totalReferences += schema.references.length;

      schema.references.forEach((ref) => {
        // Try multiple ways to find the referenced schema
        let referencedSchema = schemaMap.get(ref.schemaName);

        // If not found, try to extract the filename from the $ref path
        if (!referencedSchema && ref.$ref) {
          const extractedName = this.extractSchemaNameFromRef(ref.$ref);
          if (extractedName) {
            referencedSchema = schemaMap.get(extractedName);
          }
        }

        // If still not found, try to match by relative path
        if (!referencedSchema && ref.$ref) {
          // Remove leading ./ and trailing .schema.json
          const cleanRef = ref.$ref.replace(/^\.\//, '').replace(/\.schema\.json$/, '');
          referencedSchema = schemaMap.get(cleanRef);
        }

        if (referencedSchema && referencedSchema.id !== schema.id) {
          referencedByMap.get(referencedSchema.id)!.add(schema.id);
          resolvedReferences++;
        } else {
          unresolvedReferences++;
          // Only log unresolved references in debug mode to avoid spam
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`Unresolved reference: ${schema.name} -> ${ref.schemaName} (${ref.$ref})`);
            logger.debug(
              `Available keys for ${ref.schemaName}:`,
              Array.from(schemaMap.keys()).filter((key) => key.includes(ref.schemaName)),
            );
          }
        }
      });
    });

    // Convert Sets back to arrays for final schema objects
    schemas.forEach((schema) => {
      schema.referencedBy = Array.from(referencedByMap.get(schema.id) || []);
    });

    const duration = Date.now() - startTime;
    logger.info('ProjectManager: Schema references resolved', {
      schemaCount: schemas.length,
      totalReferences,
      resolvedReferences,
      unresolvedReferences,
      duration: `${duration}ms`,
    });
  }

  /**
   * Extracts schema name from a $ref path
   */
  private extractSchemaNameFromRef(ref: string): string | null {
    if (!ref) return null;

    // Handle different reference formats
    if (ref.startsWith('#/')) {
      // Internal reference like #/definitions/User
      const parts = ref.split('/');
      return parts[parts.length - 1] || null;
    } else if (ref.includes('.schema.json')) {
      // File reference like ./business-objects/Address.schema.json
      const filename = ref.split('/').pop() || ref;
      return filename.replace('.schema.json', '');
    } else if (ref.includes('.json')) {
      // File reference like ./user.json or user.json
      const filename = ref.split('/').pop() || ref;
      return filename.replace('.json', '');
    } else if (ref.includes('/')) {
      // Path reference like ./schemas/user
      const parts = ref.split('/');
      return parts[parts.length - 1] || null;
    } else {
      // Simple schema name
      return ref;
    }
  }

  /**
   * Extracts all $ref references from a JSON Schema object.
   */
  private extractReferences(data: unknown): SchemaReference[] {
    const references: SchemaReference[] = [];

    const extractRefs = (obj: unknown, path = '') => {
      if (typeof obj === 'object' && obj !== null) {
        const objRecord = obj as Record<string, unknown>;

        if (objRecord.$ref && typeof objRecord.$ref === 'string') {
          const schemaName = this.extractSchemaNameFromRef(objRecord.$ref);
          if (schemaName) {
            references.push({
              $ref: objRecord.$ref,
              schemaName,
            });
          }
        }

        // Recursively check all object properties
        for (const value of Object.values(objRecord)) {
          extractRefs(value, path);
        }
      }
    };

    extractRefs(data);
    return references;
  }

  /**
   * Extracts metadata from schema data.
   */
  private extractMetadata(data: unknown): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    const dataObj = data as Record<string, unknown>;
    if (dataObj.title) metadata.title = dataObj.title;
    if (dataObj.description) metadata.description = dataObj.description;
    if (dataObj.$schema) metadata.schemaVersion = dataObj.$schema;
    if (dataObj.type) metadata.type = dataObj.type;
    if (dataObj.required) metadata.required = dataObj.required;

    return metadata;
  }

  /**
   * Generates a unique project ID from path.
   */
  private generateProjectId(projectPath: string): string {
    return Buffer.from(projectPath)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Generates a unique schema ID from path.
   */
  private generateSchemaId(schemaPath: string): string {
    return Buffer.from(schemaPath)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Sets up file watching for a project.
   */
  private async setupProjectWatching(project: Project): Promise<void> {
    if (!project.settings.watchForChanges) {
      return;
    }

    try {
      const watcher = watch(project.path, {
        ignored: ['**/node_modules/**', '**/.git/**'],
        persistent: true,
      });

      watcher.on('change', async (filePath) => {
        if (filePath.endsWith('.json')) {
          logger.info('ProjectManager: Schema file changed', { filePath });
          // TODO: Implement schema reloading
        }
      });

      this.watchers.set(project.id, watcher);
    } catch (error) {
      logger.error('ProjectManager: Failed to setup file watching', { error });
    }
  }

  // RAML Import Methods

  /**
   * Scans a directory for RAML files.
   */
  public async scanRamlFiles(directoryPath: string): Promise<RamlFileInfo[]> {
    try {
      logger.info('ProjectManager: Scanning RAML files', { directoryPath });

      const files = await glob('**/*.raml', {
        cwd: directoryPath,
        absolute: true,
      });

      const ramlFiles = await Promise.all(
        files.map(async (filePath) => {
          try {
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');

            // Basic RAML validation - check if it starts with #%RAML
            const isValid = content.trim().startsWith('#%RAML');

            // Extract basic metadata
            const lines = content.split('\n');
            let title: string | undefined;
            let description: string | undefined;
            let version: string | undefined;

            for (const line of lines) {
              if (line.startsWith('title:')) {
                title = line.replace('title:', '').trim();
              } else if (line.startsWith('description:')) {
                description = line.replace('description:', '').trim();
              } else if (line.startsWith('#%RAML')) {
                version = line.replace('#%RAML', '').trim();
              }
            }

            const fileInfo: RamlFileInfo = {
              path: filePath,
              name: path.basename(filePath),
              size: stats.size,
              lastModified: stats.mtime,
              isValid,
            };

            if (version !== undefined) fileInfo.version = version;
            if (title !== undefined) fileInfo.title = title;
            if (description !== undefined) fileInfo.description = description;

            return fileInfo;
          } catch (error) {
            logger.warn('ProjectManager: Failed to process RAML file', { filePath, error });
            const errorFileInfo: RamlFileInfo = {
              path: filePath,
              name: path.basename(filePath),
              size: 0,
              lastModified: new Date(),
              isValid: false,
            };
            return errorFileInfo;
          }
        }),
      );

      logger.info('ProjectManager: RAML files scanned', {
        directoryPath,
        count: ramlFiles.length,
      });

      return ramlFiles;
    } catch (error) {
      logger.error('ProjectManager: Failed to scan RAML files', { directoryPath, error });
      throw error;
    }
  }

  /**
   * Converts multiple RAML files to JSON Schema in batch.
   */
  public async convertRamlBatch(
    options: RamlBatchConversionParams,
  ): Promise<RamlBatchConversionResult> {
    try {
      logger.info('ProjectManager: Starting batch RAML conversion', {
        sourceDirectory: options.sourceDirectory,
        destinationDirectory: options.destinationDirectory,
        options: options.options,
      });

      // Clear destination directory before conversion
      try {
        await this.clearDirectory(options.destinationDirectory);
        logger.info('ProjectManager: Destination directory cleared', {
          destinationDirectory: options.destinationDirectory,
        });
      } catch (error) {
        logger.warn('ProjectManager: Failed to clear destination directory', {
          destinationDirectory: options.destinationDirectory,
          error,
        });
        // Continue with conversion even if clearing fails
      }

      // Use the new RAML directory conversion function
      const result = await convertRamlToJsonSchemas(
        options.sourceDirectory,
        options.destinationDirectory,
      );

      logger.info('ProjectManager: Batch RAML conversion completed', {
        sourceDirectory: options.sourceDirectory,
        destinationDirectory: options.destinationDirectory,
        enums: result.enums.length,
        payloads: result.payloads.length,
      });

      return {
        success: true,
        results: [],
        summary: {
          total: result.enums.length + result.payloads.length,
          successful: result.enums.length + result.payloads.length,
          failed: 0,
          warnings: 0,
        },
      };
    } catch (error) {
      logger.error('ProjectManager: Batch RAML conversion failed with exception', {
        sourceDirectory: options.sourceDirectory,
        destinationDirectory: options.destinationDirectory,
        error,
      });
      return {
        success: false,
        results: [],
        summary: { total: 0, successful: 0, failed: 0, warnings: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clears all files from a directory.
   */
  public async clearDirectory(directoryPath: string): Promise<void> {
    try {
      logger.info('ProjectManager: Clearing directory', { directoryPath });

      const files = await fs.readdir(directoryPath);

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(directoryPath, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
        }),
      );

      logger.info('ProjectManager: Directory cleared successfully', { directoryPath });
    } catch (error) {
      logger.error('ProjectManager: Failed to clear directory', { directoryPath, error });
      throw error;
    }
  }

  /**
   * Validates all JSON schemas in a directory.
   */
  public async validateSchemasInDirectory(directoryPath: string): Promise<boolean> {
    try {
      logger.info('ProjectManager: Validating schemas in directory', { directoryPath });

      const files = await glob('**/*.json', {
        cwd: directoryPath,
        absolute: true,
      });

      let allValid = true;

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          const result = this.validateSchemaData(data);

          if (!result.isValid) {
            allValid = false;
            logger.warn('ProjectManager: Invalid schema found', {
              filePath,
              errors: result.errors,
            });
          }
        } catch (error) {
          allValid = false;
          logger.warn('ProjectManager: Failed to validate schema', { filePath, error });
        }
      }

      logger.info('ProjectManager: Schema validation completed', {
        directoryPath,
        allValid,
        totalFiles: files.length,
      });

      return allValid;
    } catch (error) {
      logger.error('ProjectManager: Failed to validate schemas', { directoryPath, error });
      return false;
    }
  }

  /**
   * Clears the project cache for a specific project or all projects.
   */
  public clearProjectCache(projectId?: string): void {
    if (projectId) {
      this.projects.delete(projectId);
      logger.info('ProjectManager: Cleared project cache', { projectId });
    } else {
      this.projects.clear();
      logger.info('ProjectManager: Cleared all project cache');
    }
  }

  /**
   * Cleans up resources when shutting down.
   */
  public async cleanup(): Promise<void> {
    // Close all file watchers
    for (const [projectId, watcher] of this.watchers) {
      await watcher.close();
      logger.info('ProjectManager: Closed file watcher', { projectId });
    }
    this.watchers.clear();
  }
}

// Export singleton instance
export const projectManager = new ProjectManager();
