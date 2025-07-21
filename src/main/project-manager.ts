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
import type { Project, ProjectConfig, Schema, ValidationResult } from '../types/schema-editor';

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
    ipcMain.handle(
      'dialog:folder',
      async (_event, options?: { title?: string; defaultPath?: string }) => {
        return this.showFolderDialog(options);
      },
    );
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

      // Load and validate schemas
      const schemas: Schema[] = [];
      let validCount = 0;
      let invalidCount = 0;

      for (const filePath of jsonFiles) {
        try {
          const schema = await this.readSchemaFile(filePath, project.id);
          if (schema) {
            schemas.push(schema);
            if (schema.validationStatus === 'valid') {
              validCount++;
            } else {
              invalidCount++;
            }
          }
        } catch (error) {
          logger.warn('Failed to read schema file', { filePath, error });
          invalidCount++;
        }
      }

      // Update project with schema data
      project.schemaIds = schemas.map((s) => s.id);
      project.schemas = schemas;
      project.status.validSchemas = validCount;
      project.status.invalidSchemas = invalidCount;
      project.status.isLoaded = true;
      project.status.isLoading = false;

      // Store project
      this.projects.set(project.id, project);

      // Set up file watching
      await this.setupProjectWatching(project);

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
  private async loadProject(projectPath: string): Promise<{
    success: boolean;
    project?: Project;
    error?: string;
  }> {
    logger.info('ProjectManager: Loading project - START', { projectPath });

    try {
      // Check if directory exists
      try {
        await fs.access(projectPath);
      } catch {
        return { success: false, error: 'Project directory does not exist' };
      }

      // Check if project is already loaded
      const projectId = this.generateProjectId(projectPath);
      const existingProject = this.projects.get(projectId);
      if (existingProject) {
        logger.info('ProjectManager: Project already loaded', { projectId });
        return { success: true, project: existingProject };
      }

      // Create project config from path
      const config: ProjectConfig = {
        name: path.basename(projectPath),
        path: projectPath,
        schemaPattern: '*.json',
        settings: {
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
      const projects = Array.from(this.projects.values())
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .slice(0, 10);

      return { success: true, projects };
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

      logger.info(`ProjectManager: Project deleted in ${Date.now() - startTime}ms`, { projectId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to delete project', { projectId, error });
      return { success: false, error: `Failed to delete project: ${errorMessage}` };
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
      return { success: true, schema: schema || undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ProjectManager: Failed to read schema', { filePath, error });
      return { success: false, error: `Failed to read schema: ${errorMessage}` };
    }
  }

  /**
   * Validates a JSON schema file.
   */
  private async validateSchema(filePath: string): Promise<{
    success: boolean;
    result?: ValidationResult;
    error?: string;
  }> {
    try {
      const result = await this.validateSchemaFile(filePath);
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
   * Reads and parses a schema file.
   */
  private async readSchemaFile(filePath: string, projectId: string): Promise<Schema | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const stats = await fs.stat(filePath);

      // Validate schema
      const validation = await this.validateSchemaFile(filePath);

      return {
        id: this.generateSchemaId(filePath),
        projectId,
        name: path.basename(filePath, '.json'),
        path: filePath,
        content: data,
        metadata: {
          title: data.title,
          description: data.description,
          version: data.version,
          $schema: data.$schema,
          lastModified: stats.mtime,
          fileSize: stats.size,
        },
        validationStatus: validation.isValid ? 'valid' : 'invalid',
        relativePath: path.relative(path.dirname(filePath), filePath),
        importSource: 'json',
        importDate: new Date(),
      };
    } catch (error) {
      logger.warn('Failed to read schema file', { filePath, error });
      return null;
    }
  }

  /**
   * Validates a schema file.
   */
  private async validateSchemaFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Basic JSON Schema validation
      const isValid = Boolean(ajv.validateSchema(data));
      const errors = ajv.errors || [];

      return {
        isValid,
        errors: errors.map((error) => ({
          path: error.instancePath,
          message: error.message || 'Unknown error',
          severity: 'error' as const,
        })),
        warnings: [],
        duration: 0,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            path: '',
            message: error instanceof Error ? error.message : 'Failed to parse JSON',
            severity: 'error' as const,
          },
        ],
        warnings: [],
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Extracts references from schema data.
   */
  private extractReferences(data: unknown): string[] {
    const references: string[] = [];

    const extractRefs = (obj: unknown, path = '') => {
      if (typeof obj === 'object' && obj !== null) {
        const objWithRef = obj as Record<string, unknown>;
        if ('$ref' in objWithRef && typeof objWithRef.$ref === 'string') {
          references.push(objWithRef.$ref);
        }
        for (const [key, value] of Object.entries(objWithRef)) {
          extractRefs(value, `${path}/${key}`);
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
