/**
 * Central app state management with Zustand and IPC integration.
 *
 * This store manages global application state including theme settings,
 * current page navigation, project management, and synchronization with the main process.
 *
 * @module useAppStore
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import logger from '../lib/renderer-logger';
import type { Project, ProjectConfig, Schema } from '../../types/schema-editor';

/**
 * Available theme options for the application.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Available page routes in the application.
 */
export type Page = 'home' | 'about' | 'settings' | 'project' | 'explore' | 'build';

/**
 * Interface defining the structure of the application state.
 */
interface AppState {
  // Theme and navigation
  /** Current theme setting */
  theme: Theme;
  /** Current active page */
  currentPage: Page;

  // Project management
  /** Currently loaded project */
  currentProject: Project | null;
  /** List of recently opened projects */
  recentProjects: Project[];
  /** Whether a project is currently loading */
  isLoadingProject: boolean;
  /** Error message if project loading failed */
  projectError: string | null;

  // Schema management
  /** All schemas in the current project */
  schemas: Schema[];
  /** Whether schemas are currently loading */
  isLoadingSchemas: boolean;
  /** Error message if schema loading failed */
  schemaError: string | null;

  // Actions
  /** Function to update the theme setting */
  setTheme: (theme: Theme) => Promise<void>;
  /** Function to navigate to a different page */
  setPage: (page: Page) => void;
  /** Function to load theme from main process settings */
  loadTheme: () => Promise<void>;
  /** Function to create a new project */
  createProject: (config: ProjectConfig) => Promise<void>;
  /** Function to load a project from path */
  loadProject: (projectPath: string) => Promise<void>;
  /** Function to set the current project */
  setCurrentProject: (project: Project | null) => void;
  /** Function to clear project error */
  clearProjectError: () => void;
  /** Function to clear schema error */
  clearSchemaError: () => void;
  /** Function to load the last project on startup */
  loadLastProject: () => Promise<void>;
  /** Function to delete a project from recent projects */
  deleteProject: (projectId: string) => Promise<void>;
}

/**
 * Zustand store for global application state management.
 *
 * This store provides:
 * - Theme management with IPC synchronization
 * - Page navigation state
 * - Persistent storage of theme preferences
 *
 * @example
 * ```tsx
 * const theme = useAppStore((state) => state.theme);
 * const setTheme = useAppStore((state) => state.setTheme);
 *
 * // Change theme
 * await setTheme('dark');
 * ```
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      currentPage: 'project',
      currentProject: null,
      recentProjects: [],
      isLoadingProject: false,
      projectError: null,
      schemas: [],
      isLoadingSchemas: false,
      schemaError: null,

      /**
       * Updates the theme setting and synchronizes with main process.
       *
       * @param theme - The new theme to set
       * @returns Promise that resolves when theme is updated
       */
      setTheme: async (theme: Theme) => {
        const result = await window.api.setTheme(theme);
        if (result.success) {
          set({ theme });
        }
      },

      /**
       * Navigates to a different page in the application.
       *
       * @param page - The page to navigate to
       */
      setPage: (page: Page) => {
        set({ currentPage: page });
      },

      /**
       * Loads the theme setting from the main process.
       *
       * This function is typically called on application startup
       * to restore the user's theme preference.
       *
       * @returns Promise that resolves when theme is loaded
       */
      loadTheme: async () => {
        const startTime = Date.now();
        logger.info('Store: Loading theme - START');

        try {
          const result = await window.api.getTheme();
          if (result.success && result.theme) {
            set({ theme: result.theme });
          }
        } catch (error) {
          logger.error('Failed to load theme:', error);
        }

        logger.info(`Store: Theme loaded in ${Date.now() - startTime}ms`);
      },

      /**
       * Creates a new project with the specified configuration.
       *
       * @param config - Project configuration
       * @returns Promise that resolves when project is created
       */
      createProject: async (config: ProjectConfig) => {
        const startTime = Date.now();
        logger.info('Store: Creating project - START', { config });

        set({ isLoadingProject: true, projectError: null });

        try {
          const result = await window.api.createProject(config);
          if (result.success && result.project) {
            set({
              currentProject: result.project,
              recentProjects: [result.project, ...get().recentProjects.slice(0, 9)], // Keep max 10 recent projects
              isLoadingProject: false,
              currentPage: 'project',
            });
            logger.info(`Store: Project created in ${Date.now() - startTime}ms`);
          } else {
            set({
              projectError: result.error || 'Failed to create project',
              isLoadingProject: false,
            });
            logger.error('Store: Failed to create project', { error: result.error });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            projectError: `Failed to create project: ${errorMessage}`,
            isLoadingProject: false,
          });
          logger.error('Store: Exception creating project', { error });
        }
      },

      /**
       * Loads a project from the specified path.
       *
       * @param projectPath - Path to the project directory
       * @returns Promise that resolves when project is loaded
       */
      loadProject: async (projectPath: string) => {
        const startTime = Date.now();
        logger.info('Store: Loading project - START', { projectPath });

        set({ isLoadingProject: true, projectError: null });

        try {
          const result = await window.api.loadProject(projectPath);
          if (result.success && result.project) {
            set({
              currentProject: result.project,
              recentProjects: [
                result.project,
                ...get()
                  .recentProjects.filter((p) => p.id !== result.project!.id)
                  .slice(0, 9),
              ],
              isLoadingProject: false,
              currentPage: 'project',
            });
            logger.info(`Store: Project loaded in ${Date.now() - startTime}ms`);
          } else {
            set({
              projectError: result.error || 'Failed to load project',
              isLoadingProject: false,
            });
            logger.error('Store: Failed to load project', { error: result.error });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            projectError: `Failed to load project: ${errorMessage}`,
            isLoadingProject: false,
          });
          logger.error('Store: Exception loading project', { error });
        }
      },

      /**
       * Sets the current project.
       *
       * @param project - Project to set as current, or null to clear
       */
      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
        logger.info('Store: Current project updated', { projectId: project?.id });
      },

      /**
       * Clears the project error.
       */
      clearProjectError: () => {
        set({ projectError: null });
      },

      /**
       * Clears the schema error.
       */
      clearSchemaError: () => {
        set({ schemaError: null });
      },

      /**
       * Loads the last project on application startup.
       *
       * This function checks if there's a persisted current project
       * and attempts to reload it from disk.
       *
       * @returns Promise that resolves when last project is loaded
       */
      loadLastProject: async () => {
        const startTime = Date.now();
        logger.info('Store: Loading last project - START');

        const state = get();
        if (!state.currentProject) {
          logger.info('Store: No last project to load');
          return;
        }

        set({ isLoadingProject: true, projectError: null });

        try {
          const result = await window.api.loadProject(state.currentProject.path);
          if (result.success && result.project) {
            set({
              currentProject: result.project,
              recentProjects: [
                result.project,
                ...state.recentProjects.filter((p) => p.id !== result.project!.id).slice(0, 9),
              ],
              isLoadingProject: false,
              currentPage: 'project',
            });
            logger.info(`Store: Last project loaded in ${Date.now() - startTime}ms`);
          } else {
            // If the project can't be loaded (e.g., directory was moved/deleted),
            // clear it from current project but keep it in recent projects
            set({
              currentProject: null,
              projectError: result.error || 'Last project could not be loaded',
              isLoadingProject: false,
              currentPage: 'home',
            });
            logger.warn('Store: Last project could not be loaded', { error: result.error });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            currentProject: null,
            projectError: `Failed to load last project: ${errorMessage}`,
            isLoadingProject: false,
            currentPage: 'home',
          });
          logger.error('Store: Exception loading last project', { error });
        }
      },

      /**
       * Deletes a project from the recent projects list.
       *
       * @param projectId - ID of the project to delete
       * @returns Promise that resolves when project is deleted
       */
      deleteProject: async (projectId: string) => {
        const startTime = Date.now();
        logger.info('Store: Deleting project - START', { projectId });

        try {
          const result = await window.api.deleteProject(projectId);
          if (result.success) {
            const state = get();
            const updatedRecentProjects = state.recentProjects.filter((p) => p.id !== projectId);

            // If the deleted project was the current project, clear it
            const shouldClearCurrent = state.currentProject?.id === projectId;

            set({
              recentProjects: updatedRecentProjects,
              ...(shouldClearCurrent && { currentProject: null, currentPage: 'home' }),
            });

            logger.info(`Store: Project deleted in ${Date.now() - startTime}ms`, { projectId });
          } else {
            logger.error('Store: Failed to delete project', { error: result.error });
            throw new Error(result.error || 'Failed to delete project');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Store: Exception deleting project', { projectId, error });
          throw new Error(`Failed to delete project: ${errorMessage}`);
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        currentProject: state.currentProject,
        recentProjects: state.recentProjects,
      }),
    },
  ),
);
