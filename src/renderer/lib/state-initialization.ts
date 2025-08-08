/**
 * Standardized state initialization utilities for Arc Elect application.
 *
 * This module provides consistent state initialization patterns
 * and default values for all application state.
 *
 * @module state-initialization
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from './renderer-logger';
import { isTheme, isPage, isSchemaFilters } from './type-guards';

// ============================================================================
// Default State Values
// ============================================================================

/**
 * Default theme setting.
 */
export const DEFAULT_THEME: Theme = 'system';

/**
 * Default page setting.
 */
export const DEFAULT_PAGE: Page = 'home';

/**
 * Default schema filters.
 */
export const DEFAULT_SCHEMA_FILTERS: SchemaFilters = {
  status: [],
  type: [],
  searchQuery: '',
  showValid: true,
  showInvalid: true,
  showError: true,
};

/**
 * Default search query.
 */
export const DEFAULT_SEARCH_QUERY = '';

/**
 * Default search history.
 */
export const DEFAULT_SEARCH_HISTORY: string[] = [];

/**
 * Default saved searches.
 */
export const DEFAULT_SAVED_SEARCHES: SavedSearch[] = [];

/**
 * Default modal stack.
 */
export const DEFAULT_MODAL_STACK: SchemaDetailModal[] = [];

/**
 * Default current modal index.
 */
export const DEFAULT_CURRENT_MODAL_INDEX = 0;

/**
 * Default selected schema ID.
 */
export const DEFAULT_SELECTED_SCHEMA_ID: string | null = null;

/**
 * Default recent projects.
 */
export const DEFAULT_RECENT_PROJECTS: Project[] = [];

/**
 * Default current project.
 */
export const DEFAULT_CURRENT_PROJECT: Project | null = null;

/**
 * Default project loading state.
 */
export const DEFAULT_IS_LOADING_PROJECT = false;

/**
 * Default project error.
 */
export const DEFAULT_PROJECT_ERROR: string | null = null;

// ============================================================================
// State Validation Functions
// ============================================================================

/**
 * Validates and sanitizes theme state.
 */
export function validateThemeState(theme: unknown): Theme {
  if (isTheme(theme)) {
    return theme;
  }

  logger.warn('Invalid theme state detected, using default', { theme });
  return DEFAULT_THEME;
}

/**
 * Validates and sanitizes page state.
 */
export function validatePageState(page: unknown): Page {
  if (isPage(page)) {
    return page;
  }

  logger.warn('Invalid page state detected, using default', { page });
  return DEFAULT_PAGE;
}

/**
 * Validates and sanitizes schema filters state.
 */
export function validateSchemaFiltersState(filters: unknown): SchemaFilters {
  if (isSchemaFilters(filters)) {
    return filters;
  }

  logger.warn('Invalid schema filters state detected, using default', {
    filters,
  });
  return DEFAULT_SCHEMA_FILTERS;
}

/**
 * Validates and sanitizes search query state.
 */
export function validateSearchQueryState(query: unknown): string {
  if (typeof query === 'string') {
    return query;
  }

  logger.warn('Invalid search query state detected, using default', { query });
  return DEFAULT_SEARCH_QUERY;
}

/**
 * Validates and sanitizes search history state.
 */
export function validateSearchHistoryState(history: unknown): string[] {
  if (
    Array.isArray(history) &&
    history.every((item) => typeof item === 'string')
  ) {
    return history;
  }

  logger.warn('Invalid search history state detected, using default', {
    history,
  });
  return DEFAULT_SEARCH_HISTORY;
}

/**
 * Validates and sanitizes saved searches state.
 */
export function validateSavedSearchesState(searches: unknown): SavedSearch[] {
  if (Array.isArray(searches)) {
    // Basic validation - in a real app, you'd use a proper type guard
    const validSearches = searches.filter(
      (search) =>
        typeof search === 'object' &&
        search !== null &&
        typeof (search as any).id === 'string' &&
        typeof (search as any).name === 'string' &&
        typeof (search as any).query === 'string',
    );

    if (validSearches.length === searches.length) {
      return searches as SavedSearch[];
    }
  }

  logger.warn('Invalid saved searches state detected, using default', {
    searches,
  });
  return DEFAULT_SAVED_SEARCHES;
}

/**
 * Validates and sanitizes modal stack state.
 */
export function validateModalStackState(stack: unknown): SchemaDetailModal[] {
  if (Array.isArray(stack)) {
    // Basic validation - in a real app, you'd use a proper type guard
    const validModals = stack.filter(
      (modal) =>
        typeof modal === 'object' &&
        modal !== null &&
        typeof (modal as any).id === 'string',
    );

    if (validModals.length === stack.length) {
      return stack as SchemaDetailModal[];
    }
  }

  logger.warn('Invalid modal stack state detected, using default', { stack });
  return DEFAULT_MODAL_STACK;
}

/**
 * Validates and sanitizes current modal index state.
 */
export function validateCurrentModalIndexState(index: unknown): number {
  if (typeof index === 'number' && index >= 0) {
    return index;
  }

  logger.warn('Invalid current modal index state detected, using default', {
    index,
  });
  return DEFAULT_CURRENT_MODAL_INDEX;
}

/**
 * Validates and sanitizes selected schema ID state.
 */
export function validateSelectedSchemaIdState(id: unknown): string | null {
  if (id === null || (typeof id === 'string' && id.length > 0)) {
    return id;
  }

  logger.warn('Invalid selected schema ID state detected, using default', {
    id,
  });
  return DEFAULT_SELECTED_SCHEMA_ID;
}

/**
 * Validates and sanitizes recent projects state.
 */
export function validateRecentProjectsState(projects: unknown): Project[] {
  if (Array.isArray(projects)) {
    // Basic validation - in a real app, you'd use a proper type guard
    const validProjects = projects.filter(
      (project) =>
        typeof project === 'object' &&
        project !== null &&
        typeof (project as any).id === 'string' &&
        typeof (project as any).name === 'string',
    );

    if (validProjects.length === projects.length) {
      return projects as Project[];
    }
  }

  logger.warn('Invalid recent projects state detected, using default', {
    projects,
  });
  return DEFAULT_RECENT_PROJECTS;
}

/**
 * Validates and sanitizes current project state.
 */
export function validateCurrentProjectState(project: unknown): Project | null {
  if (project === null) {
    return null;
  }

  if (typeof project === 'object' && project !== null) {
    const projectObj = project as any;
    if (
      typeof projectObj.id === 'string' &&
      typeof projectObj.name === 'string'
    ) {
      return project as Project;
    }
  }

  logger.warn('Invalid current project state detected, using default', {
    project,
  });
  return DEFAULT_CURRENT_PROJECT;
}

/**
 * Validates and sanitizes project loading state.
 */
export function validateIsLoadingProjectState(isLoading: unknown): boolean {
  if (typeof isLoading === 'boolean') {
    return isLoading;
  }

  logger.warn('Invalid project loading state detected, using default', {
    isLoading,
  });
  return DEFAULT_IS_LOADING_PROJECT;
}

/**
 * Validates and sanitizes project error state.
 */
export function validateProjectErrorState(error: unknown): string | null {
  if (error === null || typeof error === 'string') {
    return error;
  }

  logger.warn('Invalid project error state detected, using default', { error });
  return DEFAULT_PROJECT_ERROR;
}

// ============================================================================
// State Initialization Functions
// ============================================================================

/**
 * Creates a complete initial app state with validation.
 */
export function createInitialAppState(): AppState {
  return {
    // Theme and navigation
    theme: DEFAULT_THEME,
    currentPage: DEFAULT_PAGE,

    // Project management
    currentProject: DEFAULT_CURRENT_PROJECT,
    recentProjects: DEFAULT_RECENT_PROJECTS,
    isLoadingProject: DEFAULT_IS_LOADING_PROJECT,
    projectError: DEFAULT_PROJECT_ERROR,

    // Search and filtering
    searchQuery: DEFAULT_SEARCH_QUERY,
    searchFilters: DEFAULT_SCHEMA_FILTERS,
    savedSearches: DEFAULT_SAVED_SEARCHES,
    searchHistory: DEFAULT_SEARCH_HISTORY,

    // Modal navigation
    modalStack: DEFAULT_MODAL_STACK,
    currentModalIndex: DEFAULT_CURRENT_MODAL_INDEX,
    selectedSchemaId: DEFAULT_SELECTED_SCHEMA_ID,

    // Actions (these will be set by the store)
    setTheme: async () => {},
    setPage: () => {},
    loadTheme: async () => {},
    createProject: async () => {},
    loadProject: async () => {},
    setCurrentProject: () => {},
    saveCurrentProject: () => {},
    clearProjectError: () => {},
    loadLastProject: async () => {},
    deleteProject: async () => {},
    setSearchQuery: () => {},
    setSearchFilters: () => {},
    saveSearch: () => {},
    loadSavedSearch: () => {},
    deleteSavedSearch: () => {},
    clearSearchHistory: () => {},
    openSchemaModal: () => {},
    navigateToSchema: () => {},
    goBack: () => {},
    closeAllModals: () => {},
    setActiveModalTab: () => {},
  };
}

/**
 * Validates and sanitizes a complete app state.
 */
export function validateAppState(state: unknown): AppState {
  if (typeof state !== 'object' || state === null) {
    logger.error('Invalid app state detected, creating new state', { state });
    return createInitialAppState();
  }

  const stateObj = state as Record<string, unknown>;

  return {
    // Theme and navigation
    theme: validateThemeState(stateObj.theme),
    currentPage: validatePageState(stateObj.currentPage),

    // Project management
    currentProject: validateCurrentProjectState(stateObj.currentProject),
    recentProjects: validateRecentProjectsState(stateObj.recentProjects),
    isLoadingProject: validateIsLoadingProjectState(stateObj.isLoadingProject),
    projectError: validateProjectErrorState(stateObj.projectError),

    // Search and filtering
    searchQuery: validateSearchQueryState(stateObj.searchQuery),
    searchFilters: validateSchemaFiltersState(stateObj.searchFilters),
    savedSearches: validateSavedSearchesState(stateObj.savedSearches),
    searchHistory: validateSearchHistoryState(stateObj.searchHistory),

    // Modal navigation
    modalStack: validateModalStackState(stateObj.modalStack),
    currentModalIndex: validateCurrentModalIndexState(
      stateObj.currentModalIndex,
    ),
    selectedSchemaId: validateSelectedSchemaIdState(stateObj.selectedSchemaId),

    // Actions (these will be set by the store)
    setTheme: async () => {},
    setPage: () => {},
    loadTheme: async () => {},
    createProject: async () => {},
    loadProject: async () => {},
    setCurrentProject: () => {},
    saveCurrentProject: () => {},
    clearProjectError: () => {},
    loadLastProject: async () => {},
    deleteProject: async () => {},
    setSearchQuery: () => {},
    setSearchFilters: () => {},
    saveSearch: () => {},
    loadSavedSearch: () => {},
    deleteSavedSearch: () => {},
    clearSearchHistory: () => {},
    openSchemaModal: () => {},
    navigateToSchema: () => {},
    goBack: () => {},
    closeAllModals: () => {},
    setActiveModalTab: () => {},
  };
}

/**
 * Merges partial state with defaults.
 */
export function mergeStateWithDefaults<T extends Record<string, unknown>>(
  partialState: Partial<T>,
  defaultState: T,
): T {
  const result = { ...defaultState };

  for (const [key, value] of Object.entries(partialState)) {
    if (value !== undefined) {
      (result as any)[key] = value;
    }
  }

  return result;
}

/**
 * Creates a state validator function for a specific state type.
 */
export function createStateValidator<T>(
  validator: (value: unknown) => value is T,
  defaultValue: T,
) {
  return (value: unknown): T => {
    if (validator(value)) {
      return value;
    }

    logger.warn('State validation failed, using default', { value });
    return defaultValue;
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

type Theme = 'light' | 'dark' | 'system';
type Page =
  | 'home'
  | 'about'
  | 'settings'
  | 'project'
  | 'explore'
  | 'build'
  | 'analytics';

interface SchemaFilters {
  status: string[];
  type: string[];
  searchQuery: string;
  showValid: boolean;
  showInvalid: boolean;
  showError: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SchemaFilters;
  createdAt: Date;
}

interface SchemaDetailModal {
  schema: Schema;
  activeTab:
    | 'overview'
    | 'content'
    | 'properties'
    | 'references'
    | 'validation';
  id: string;
}

interface Project {
  id: string;
  name: string;
  path: string;
  schemas: Schema[];
  createdAt: Date;
  lastModified: Date;
}

interface Schema {
  id: string;
  name: string;
  path: string;
  content: Record<string, unknown>;
  metadata: SchemaMetadata;
  referencedBy: string[];
}

interface SchemaMetadata {
  title?: string;
  description?: string;
  fileSize?: number;
  lastModified?: Date;
  version?: string;
  status?: string;
  type?: string;
}

interface AppState {
  // Theme and navigation
  theme: Theme;
  currentPage: Page;

  // Project management
  currentProject: Project | null;
  recentProjects: Project[];
  isLoadingProject: boolean;
  projectError: string | null;

  // Search and filtering
  searchQuery: string;
  searchFilters: SchemaFilters;
  savedSearches: SavedSearch[];
  searchHistory: string[];

  // Modal navigation
  modalStack: SchemaDetailModal[];
  currentModalIndex: number;
  selectedSchemaId: string | null;

  // Actions
  setTheme: (theme: Theme) => Promise<void>;
  setPage: (page: Page) => void;
  loadTheme: () => Promise<void>;
  createProject: (config: ProjectConfig) => Promise<void>;
  loadProject: (projectPath: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  saveCurrentProject: () => void;
  clearProjectError: () => void;
  loadLastProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: Partial<SchemaFilters>) => void;
  saveSearch: (name: string) => void;
  loadSavedSearch: (searchId: string) => void;
  deleteSavedSearch: (searchId: string) => void;
  clearSearchHistory: () => void;
  openSchemaModal: (
    schema: Schema,
    tab?: SchemaDetailModal['activeTab'],
  ) => void;
  navigateToSchema: (
    schema: Schema,
    tab?: SchemaDetailModal['activeTab'],
  ) => void;
  goBack: () => void;
  closeAllModals: () => void;
  setActiveModalTab: (tab: SchemaDetailModal['activeTab']) => void;
}

interface ProjectConfig {
  name: string;
  path: string;
  description?: string;
}
