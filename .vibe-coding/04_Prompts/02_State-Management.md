# State Management Template

## 🎯 **Template Purpose**

Implement state management for the Arc Elect JSON Schema Editor using Zustand, with proper project-schema relationships, cross-module synchronization, and persistence.

## 📋 **Template Usage**

Replace the placeholders below with your specific requirements:

- `[FEATURE_NAME]` - The name of the feature you're implementing
- `[STATE_DESCRIPTION]` - Description of what state you need to manage
- `[SPECIFIC_REQUIREMENTS]` - Any specific requirements or constraints

## 🚀 **Prompt Template**

````
I need to implement state management for the Arc Elect JSON Schema Editor project.

**Feature Details:**
- Feature Name: [FEATURE_NAME]
- State Description: [STATE_DESCRIPTION]
- Specific Requirements: [SPECIFIC_REQUIREMENTS]

**Project Context:**
- Tech Stack: Electron 37.2.3, React 19.1.0, TypeScript 5.8.3, Zustand 5.0.6
- State Management: Zustand for global state, React Query for server state
- Persistence: Electron Store for settings and project data
- Patterns: Follow established project-schema relationship patterns

**Project-Schema Relationship Pattern:**
```typescript
// Project-Schema relatie structuur
interface Project {
  id: string;
  name: string;
  path: string;
  schemaIds: string[]; // Schemas die bij dit project horen
  status: ProjectStatus;
}

interface Schema {
  id: string;
  projectId: string; // Link naar het project
  name: string;
  path: string;
  relativePath: string; // Relatief aan project root
  // ... andere properties
}

// State organisatie per project
interface AppState {
  projects: Record<string, Project>; // Project ID -> Project
  schemas: Record<string, Schema[]>; // Project ID -> Schema[]
  currentProject: Project | null;
  // ... andere state
}
````

**Requirements:**

1. Extend the existing Zustand store following established patterns
2. Implement proper project-schema relationships
3. Add state selectors for easy data access
4. Implement cross-module state synchronization
5. Add persistence for critical state data
6. Include proper TypeScript types and interfaces
7. Implement state validation and error handling
8. Add performance optimizations for large datasets
9. Include state change logging and debugging
10. Follow the project's error handling patterns

**Additional Context:**

- This state will be used across multiple modules (Project, Explore, Build)
- Performance is important for large schema collections
- State changes should trigger real-time updates across modules
- Need to handle file system changes and schema updates

Please provide:

1. Complete Zustand store implementation with TypeScript interfaces
2. State selectors and helper functions
3. Cross-module synchronization logic
4. Persistence implementation
5. Performance optimization strategies
6. Testing considerations and examples

````

## 🏗️ **State Management Architecture**

### **Project-Schema Relationship Pattern**

```typescript
// Core interfaces voor project-schema relaties
interface Project {
  id: string;
  name: string;
  path: string;
  schemaPattern: string;
  createdAt: Date;
  lastModified: Date;
  settings: ProjectSettings;
  schemaIds: string[]; // Schemas die bij dit project horen
  status: ProjectStatus;
}

interface Schema {
  id: string;
  projectId: string; // Link naar het project
  name: string;
  path: string;
  relativePath: string; // Relatief aan project root
  content: any;
  metadata: SchemaMetadata;
  references: string[];
  referencedBy: string[];
  validationStatus: ValidationStatus;
  importSource?: 'json' | 'raml';
  importDate?: Date;
}

// State organisatie per project
interface AppState {
  // Project management
  projects: Record<string, Project>;
  currentProject: Project | null;

  // Schema management per project
  schemas: Record<string, Schema[]>; // Project ID -> Schema[]
  selectedSchema: Schema | null;

  // UI state
  currentModule: 'project' | 'explore' | 'build';
  openTabs: Tab[];
  activeTab: string | null;

  // Analytics per project
  analytics: Record<string, SchemaAnalytics>;

  // Settings
  theme: 'light' | 'dark' | 'system';
  editorSettings: EditorConfig;
}
````

### **State Selectors Pattern**

```typescript
// State selectors voor gemakkelijke toegang
interface StateSelectors {
  // Project selectors
  getCurrentProject: () => Project | null;
  getProjectById: (projectId: string) => Project | null;
  getAllProjects: () => Project[];

  // Schema selectors
  getCurrentProjectSchemas: () => Schema[];
  getSchemaById: (schemaId: string) => Schema | null;
  getSchemasByProject: (projectId: string) => Schema[];
  getSchemasByValidationStatus: (status: ValidationStatus) => Schema[];

  // UI selectors
  getCurrentModule: () => AppState['currentModule'];
  getOpenTabs: () => Tab[];
  getActiveTab: () => Tab | null;

  // Analytics selectors
  getCurrentProjectAnalytics: () => SchemaAnalytics | null;
  getAnalyticsByProject: (projectId: string) => SchemaAnalytics | null;
}
```

## 🔧 **Zustand Store Implementation**

### **Store Structure**

```typescript
// src/renderer/stores/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AppStore extends AppState {
  // Actions
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;

  addSchemas: (projectId: string, schemas: Schema[]) => void;
  updateSchema: (projectId: string, schemaId: string, updates: Partial<Schema>) => void;
  removeSchema: (projectId: string, schemaId: string) => void;

  setSelectedSchema: (schema: Schema | null) => void;
  setCurrentModule: (module: AppState['currentModule']) => void;

  // Complex actions
  loadProject: (projectPath: string) => Promise<void>;
  scanProjectSchemas: (projectId: string) => Promise<void>;
  validateProjectSchemas: (projectId: string) => Promise<void>;

  // Selectors
  getCurrentProjectSchemas: () => Schema[];
  getSchemaById: (schemaId: string) => Schema | null;
  getProjectById: (projectId: string) => Project | null;
}

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      projects: {},
      schemas: {},
      currentProject: null,
      selectedSchema: null,
      currentModule: 'project',
      openTabs: [],
      activeTab: null,
      analytics: {},
      theme: 'system',
      editorSettings: {},

      // Actions
      setCurrentProject: (project) =>
        set((state) => {
          state.currentProject = project;
        }),

      addProject: (project) =>
        set((state) => {
          state.projects[project.id] = project;
          state.schemas[project.id] = [];
          state.analytics[project.id] = createInitialAnalytics();
        }),

      addSchemas: (projectId, schemas) =>
        set((state) => {
          if (!state.schemas[projectId]) {
            state.schemas[projectId] = [];
          }
          state.schemas[projectId].push(...schemas);

          // Update project schemaIds
          if (state.projects[projectId]) {
            state.projects[projectId].schemaIds = state.schemas[projectId].map((s) => s.id);
          }
        }),

      // Complex actions
      loadProject: async (projectPath) => {
        set((state) => {
          state.currentProject = null;
          state.selectedSchema = null;
        });

        try {
          // Load project from file system
          const project = await loadProjectFromPath(projectPath);
          const schemas = await scanProjectSchemas(projectPath);

          set((state) => {
            state.projects[project.id] = project;
            state.schemas[project.id] = schemas;
            state.currentProject = project;
            state.currentModule = 'explore';
          });
        } catch (error) {
          logger.error('Failed to load project', { projectPath, error });
          toast.error('Failed to load project');
        }
      },

      // Selectors
      getCurrentProjectSchemas: () => {
        const state = get();
        if (!state.currentProject) return [];
        return state.schemas[state.currentProject.id] || [];
      },

      getSchemaById: (schemaId) => {
        const state = get();
        for (const schemas of Object.values(state.schemas)) {
          const schema = schemas.find((s) => s.id === schemaId);
          if (schema) return schema;
        }
        return null;
      },

      getProjectById: (projectId) => {
        const state = get();
        return state.projects[projectId] || null;
      },
    })),
    {
      name: 'arc-elect-store',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
        theme: state.theme,
        editorSettings: state.editorSettings,
      }),
    },
  ),
);
```

## 🔄 **Cross-Module Synchronization**

### **State Change Propagation**

```typescript
// State change tracking en propagation
interface StateChange {
  type: 'project' | 'schema' | 'ui' | 'analytics';
  action: string;
  projectId?: string;
  schemaId?: string;
  data: any;
  timestamp: Date;
}

// State change observer
const useStateChangeObserver = () => {
  const subscribe = useCallback((callback: (change: StateChange) => void) => {
    // Subscribe to state changes
    return useAppStore.subscribe((state, prevState) => {
      // Detect changes and notify subscribers
      const changes = detectStateChanges(prevState, state);
      changes.forEach((change) => callback(change));
    });
  }, []);

  return { subscribe };
};
```

## 📊 **Performance Optimization**

### **State Optimization Strategies**

```typescript
// Lazy loading voor grote schema collecties
const useLazySchemas = (projectId: string, pageSize: number = 50) => {
  const [page, setPage] = useState(0);
  const schemas = useAppStore((state) => state.schemas[projectId] || []);

  const paginatedSchemas = useMemo(() => {
    const start = page * pageSize;
    return schemas.slice(start, start + pageSize);
  }, [schemas, page, pageSize]);

  return {
    schemas: paginatedSchemas,
    hasMore: (page + 1) * pageSize < schemas.length,
    loadMore: () => setPage((p) => p + 1),
  };
};

// Memoized selectors voor performance
const useMemoizedSchemaSelector = (schemaId: string) => {
  return useAppStore(
    useCallback(
      (state) => {
        for (const schemas of Object.values(state.schemas)) {
          const schema = schemas.find((s) => s.id === schemaId);
          if (schema) return schema;
        }
        return null;
      },
      [schemaId],
    ),
  );
};
```

## 🧪 **Testing Strategies**

### **Store Testing**

```typescript
// Store testing utilities
import { renderHook, act } from '@testing-library/react-hooks';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      projects: {},
      schemas: {},
      currentProject: null,
      // ... reset all state
    });
  });

  it('should add project correctly', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addProject(mockProject);
    });

    expect(result.current.projects[mockProject.id]).toEqual(mockProject);
  });

  it('should handle project-schema relationships', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addProject(mockProject);
      result.current.addSchemas(mockProject.id, mockSchemas);
    });

    expect(result.current.getCurrentProjectSchemas()).toHaveLength(mockSchemas.length);
    expect(result.current.projects[mockProject.id].schemaIds).toEqual(mockSchemas.map((s) => s.id));
  });
});
```

## 📚 **Additional Resources**

### **Project Documentation**

- `src/renderer/stores/useAppStore.ts` - Existing store implementation
- `DEV_GUIDELINES.md` - State management patterns
- `src/renderer/lib/` - Utility functions and helpers

### **External Resources**

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Persist Middleware](https://github.com/pmndrs/zustand/tree/main/src/middleware)
- [Immer Integration](https://immerjs.github.io/immer/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

This template ensures your state management follows the project's established patterns and maintains proper project-schema relationships throughout the application.
