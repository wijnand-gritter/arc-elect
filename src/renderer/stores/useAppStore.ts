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
import { devtools, persist } from 'zustand/middleware';
import logger from '../lib/renderer-logger';
import { isProject, isTheme, isPage, validateWithLogging } from '../lib/type-guards';
import type { Project, ProjectConfig, Schema, SchemaFilters } from '../../types/schema-editor';

/**
 * Available theme options for the application.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Available page routes in the application.
 */
export type Page = 'home' | 'about' | 'settings' | 'project' | 'explore' | 'build' | 'analytics';

/**
 * Saved search configuration.
 */
export interface SavedSearch {
  /** Unique identifier */
  id: string;
  /** Search name */
  name: string;
  /** Search query */
  query: string;
  /** Search filters */
  filters: SchemaFilters;
  /** When the search was created */
  createdAt: Date;
}

/**
 * Schema detail modal state.
 */
export interface SchemaDetailModal {
  /** Schema being displayed */
  schema: Schema;
  /** Modal tab */
  activeTab: 'overview' | 'content' | 'properties' | 'references' | 'validation';
  /** Modal ID for navigation */
  id: string;
}

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

  // Schema management is handled via currentProject.schemas

  // Search and filtering
  /** Current search query */
  searchQuery: string;
  /** Current search filters */
  searchFilters: SchemaFilters;
  /** Saved searches */
  savedSearches: SavedSearch[];
  /** Search history */
  searchHistory: string[];

  // Modal navigation
  /** Stack of open schema detail modals */
  modalStack: SchemaDetailModal[];
  /** Index of current modal in stack */
  currentModalIndex: number;
  /** Currently selected schema ID */
  selectedSchemaId: string | null;

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
  /** Function to save current project for persistence */
  saveCurrentProject: () => void;
  /** Function to clear project error */
  clearProjectError: () => void;

  /** Function to load the last project on startup */
  loadLastProject: () => Promise<void>;
  /** Function to delete a project from recent projects */
  deleteProject: (projectId: string) => Promise<void>;

  // Search actions
  /** Function to set search query */
  setSearchQuery: (query: string) => void;
  /** Function to set search filters */
  setSearchFilters: (filters: Partial<SchemaFilters>) => void;
  /** Function to save current search */
  saveSearch: (name: string) => void;
  /** Function to load a saved search */
  loadSavedSearch: (searchId: string) => void;
  /** Function to delete a saved search */
  deleteSavedSearch: (searchId: string) => void;
  /** Function to clear search history */
  clearSearchHistory: () => void;

  // Modal actions
  /** Function to open schema detail modal */
  openSchemaModal: (schema: Schema, tab?: SchemaDetailModal['activeTab']) => void;
  /** Function to navigate to a schema in modal */
  navigateToSchema: (schema: Schema, tab?: SchemaDetailModal['activeTab']) => void;
  /** Function to go back in modal stack */
  goBack: () => void;
  /** Function to close all modals */
  closeAllModals: () => void;
  /** Function to set active modal tab */
  setActiveModalTab: (tab: SchemaDetailModal['activeTab']) => void;
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
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',
        currentPage: 'project',
        currentProject: null,
        recentProjects: [],
        isLoadingProject: false,
        projectError: null,

        // Search and filtering
        searchQuery: '',
        searchFilters: {
          search: '',
          validationStatus: 'all',
          sortBy: 'name',
          sortDirection: 'asc',
        },
        savedSearches: [],
        searchHistory: [],

        // Modal navigation
        modalStack: [],
        currentModalIndex: 0,
        selectedSchemaId: null,

        /**
         * Loads a project from the given path.
         *
         * @param projectPath - Path to the project directory
         */
        loadProject: async (projectPath: string) => {
          const startTime = Date.now();
          logger.info('Store: Loading project', { projectPath });

          set({ isLoadingProject: true, projectError: null });

          try {
            const result = await window.api.loadProject(projectPath);
            if (result.success && result.project) {
              // Validate project data with type guards
              if (!validateWithLogging(result.project, isProject, 'loadProject result')) {
                throw new Error('Invalid project data received from main process');
              }

              // Debug: Log schema IDs to verify they're properly transferred
              logger.info('Store: Project loaded with schemas', {
                projectName: result.project.name,
                schemaCount: result.project.schemas?.length ?? 0,
                schemaIds:
                  result.project.schemas?.map((s) => ({
                    name: s.name,
                    id: s.id,
                    referencedByCount: s.referencedBy?.length ?? 0,
                  })) ?? [],
              });

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

              // Save the current project for persistence
              get().saveCurrentProject();

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
          // Validate project data if not null
          if (project && !validateWithLogging(project, isProject, 'setCurrentProject')) {
            logger.error('Store: Invalid project data in setCurrentProject');
            return;
          }

          set({ currentProject: project });
          logger.info('Store: Current project updated', { projectId: project?.id });

          // Save the current project for persistence if it exists
          if (project) {
            get().saveCurrentProject();
          }
        },

        /**
         * Sets the theme with validation.
         */
        setTheme: async (theme: Theme) => {
          // Validate theme with type guard
          if (!validateWithLogging(theme, isTheme, 'setTheme')) {
            logger.error('Store: Invalid theme value', { theme });
            return;
          }

          set({ theme });
          await window.api.setTheme(theme);
          logger.info('Store: Theme updated', { theme });
        },

        /**
         * Sets the current page with validation.
         */
        setPage: (page: Page) => {
          // Validate page with type guard
          if (!validateWithLogging(page, isPage, 'setPage')) {
            logger.error('Store: Invalid page value', { page });
            return;
          }

          set({ currentPage: page });
          logger.info('Store: Page changed', { page });
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

              // Save the current project for persistence
              get().saveCurrentProject();

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
         * Saves the current project state for persistence.
         *
         * This function ensures the current project is saved to local storage
         * so it can be restored on next app startup.
         */
        saveCurrentProject: () => {
          const state = get();
          if (state.currentProject) {
            logger.info('Store: Saving current project for persistence', {
              projectId: state.currentProject.id,
              projectName: state.currentProject.name,
            });
            // The persist middleware will automatically save the state
            // We just need to trigger a state update to ensure it's saved
            set({ currentProject: state.currentProject });
          }
        },

        /**
         * Clears the project error.
         */
        clearProjectError: () => {
          set({ projectError: null });
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

        // Search actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },
        setSearchFilters: (filters: Partial<SchemaFilters>) => {
          set((state) => ({
            searchFilters: { ...state.searchFilters, ...filters },
          }));
        },
        saveSearch: (name: string) => {
          const newSearch: SavedSearch = {
            id: Date.now().toString(), // Simple ID generation
            name,
            query: get().searchQuery,
            filters: get().searchFilters,
            createdAt: new Date(),
          };
          set((state) => ({
            savedSearches: [newSearch, ...state.savedSearches],
            searchHistory: [...state.searchHistory, name],
          }));
        },
        loadSavedSearch: (searchId: string) => {
          const search = get().savedSearches.find((s) => s.id === searchId);
          if (search) {
            set({
              searchQuery: search.query,
              searchFilters: search.filters,
            });
          }
        },
        deleteSavedSearch: (searchId: string) => {
          set((state) => ({
            savedSearches: state.savedSearches.filter((s) => s.id !== searchId),
            searchHistory: state.searchHistory.filter(
              (h) => h !== get().savedSearches.find((s) => s.id === searchId)?.name,
            ),
          }));
        },
        clearSearchHistory: () => {
          set({ searchHistory: [] });
        },

        // Modal actions
        openSchemaModal: (schema: Schema, tab?: SchemaDetailModal['activeTab']) => {
          set((state) => {
            const newModal = { schema, activeTab: tab || 'overview', id: Date.now().toString() };
            const newModalStack = [...state.modalStack, newModal];
            return {
              modalStack: newModalStack,
              currentModalIndex: newModalStack.length - 1,
              selectedSchemaId: schema.id,
            };
          });
        },
        navigateToSchema: (schema: Schema, tab?: SchemaDetailModal['activeTab']) => {
          set((state) => ({
            modalStack: [
              ...state.modalStack,
              { schema, activeTab: tab || 'overview', id: Date.now().toString() },
            ],
            currentModalIndex: state.modalStack.length,
            selectedSchemaId: schema.id,
          }));
        },
        goBack: () => {
          set((state) => {
            const newStack = state.modalStack.slice(0, -1);
            const newIndex = Math.max(0, state.modalStack.length - 2);
            const selectedSchemaId =
              newStack.length > 0 ? (newStack[newIndex]?.schema.id ?? null) : null;

            return {
              modalStack: newStack,
              currentModalIndex: newIndex,
              selectedSchemaId,
            };
          });
        },
        closeAllModals: () => {
          set({ modalStack: [], currentModalIndex: 0, selectedSchemaId: null });
        },
        setActiveModalTab: (tab: SchemaDetailModal['activeTab']) => {
          set((state) => ({
            modalStack: state.modalStack.map((modal, index) =>
              index === state.currentModalIndex ? { ...modal, activeTab: tab } : modal,
            ),
          }));
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
    {
      name: 'App Store',
    },
  ),
);
