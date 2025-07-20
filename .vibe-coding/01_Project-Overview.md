# Project Overview: Arc Elect - JSON Schema Editor & Analytics

## 🎯 **Project Vision**

Arc Elect is a sophisticated desktop application for JSON schema editing, analysis, and management. It provides a comprehensive workspace for developers and data architects to work with JSON schemas through an intuitive, modular interface.

## 🏗️ **Application Architecture**

### **Core Technology Stack**

- **Electron 37.2.3** - Cross-platform desktop application framework
- **React 19.1.0** - Modern UI framework with hooks and performance optimization
- **TypeScript 5.8.3** - Type-safe development with strict configuration
- **Vite 7.0.5** - Fast build tooling and development server

### **State Management & Data Flow**

- **Zustand 5.0.6** - Global application state with persistence
- **TanStack Query 5.83.0** - Server state management for file operations
- **Electron Store 10.1.0** - Settings and project configuration persistence
- **React Hook Form 7.60.0** - Form handling with Zod validation

### **UI/UX Framework**

- **shadcn/ui** - Component library with Radix UI primitives
- **Tailwind CSS 4.1.11** - Utility-first styling with design system
- **Monaco Editor** - Advanced code editing capabilities
- **Lucide React** - Icon system and visual consistency
- **Sonner** - Toast notifications and user feedback

### **Development Infrastructure**

- **Playwright** - E2E testing for user workflows
- **Vitest** - Unit testing and component testing
- **ESLint + Prettier** - Code quality and formatting
- **Husky + Commitlint** - Git hooks and conventional commits

## 📋 **Module Architecture**

### **1. Project Module** 🗂️

**Purpose**: Project initialization and schema import management

#### **Core Features**

- **Local Project Creation**: Select folder from disk to create project workspace
- **JSON Schema Discovery**: Automatically load all `.json` files from selected directory
- **RAML Import System**: Transform RAML schemas to JSON format
  - Source folder selection (RAML schemas)
  - Destination folder configuration (create new or use existing)
  - Batch processing with existing transformation script
  - Clear destination folder functionality

#### **Technical Requirements**

- File system integration via Electron IPC
- Schema validation and parsing
- Progress tracking for import operations
- Error handling for malformed schemas
- Project configuration persistence

### **2. Explore Module** 🔍

**Purpose**: Schema exploration and analytics without editing capabilities

#### **Core Features**

- **Schema Overview**: Grid/list view of all loaded schemas
- **Schema Detail Modal**: In-depth schema inspection
- **Reference Navigation**: "Referenced By" and "References" navigation
- **Analytics Dashboard**: Comprehensive schema analysis
  - Circular reference detection
  - Schema complexity metrics
  - Reference depth analysis
  - Validation statistics

#### **Technical Requirements**

- Schema parsing and analysis engine
- Graph-based reference tracking
- Performance optimization for large schema sets
- Modal management and navigation state
- Analytics calculation and caching

### **3. Build Module** 🛠️

**Purpose**: Schema editing and validation with real-time updates

#### **Core Features**

- **Tree View Navigation**: Hierarchical schema browser
- **Tabular Editor Interface**: Monaco editor integration
- **Multi-Tab Management**: Horizontal scrolling for multiple open schemas
- **Live Preview**: Real-time schema preview pane
- **Validation System**: Individual and batch schema validation
- **Real-time Synchronization**: Immediate updates across all modules

#### **Technical Requirements**

- Monaco editor integration and configuration
- Tab management system with state persistence
- Real-time validation engine
- Cross-module state synchronization
- Performance optimization for large schemas

## 🔄 **Data Flow & State Management**

### **Global State Structure**

```typescript
interface AppState {
  // Project Management
  currentProject: Project | null;
  projectPath: string | null;

  // Schema Management - Georganiseerd per project
  projects: Record<string, Project>; // Project ID -> Project
  schemas: Record<string, Schema[]>; // Project ID -> Schema[]
  selectedSchema: Schema | null;

  // UI State
  currentModule: 'project' | 'explore' | 'build';
  openTabs: Tab[];
  activeTab: string | null;

  // Analytics - Per project
  analytics: Record<string, SchemaAnalytics>; // Project ID -> Analytics

  // Settings
  theme: 'light' | 'dark' | 'system';
  editorSettings: EditorConfig;
}

// Helper types voor project-schema relaties
interface ProjectSchemaRelation {
  projectId: string;
  schemaId: string;
  relationship: 'belongs_to' | 'references' | 'referenced_by';
}

// State selectors voor gemakkelijke toegang
interface StateSelectors {
  getCurrentProjectSchemas: () => Schema[];
  getSchemaById: (schemaId: string) => Schema | null;
  getProjectById: (projectId: string) => Project | null;
  getSchemasByProject: (projectId: string) => Schema[];
}
```

### **Cross-Module Synchronization**

- **Real-time Updates**: Changes in Build module immediately reflect in Explore
- **Shared State**: Schema data shared across all modules via Zustand
- **Event System**: IPC-based communication for file system changes
- **Caching Strategy**: Intelligent caching for performance optimization

## 🎨 **User Experience Design**

### **Navigation Pattern**

- **Module-based Navigation**: Clear separation between Project, Explore, and Build
- **Breadcrumb Navigation**: Context-aware navigation within modules
- **Modal Workflows**: Detailed views without losing context
- **Tab Management**: Efficient multi-schema editing experience

### **Performance Considerations**

- **Lazy Loading**: Schemas loaded on-demand
- **Virtual Scrolling**: Handle large schema collections efficiently
- **Background Processing**: Analytics and validation in background
- **Caching Strategy**: Intelligent caching for frequently accessed data

### **Accessibility & Usability**

- **Keyboard Navigation**: Full keyboard support for power users
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Error Handling**: Clear error messages and recovery options
- **Loading States**: Informative loading indicators and progress tracking

## 🔧 **Technical Implementation Strategy**

### **File System Integration**

- **Secure IPC Bridge**: File operations through main process
- **Path Validation**: Security-first file path handling
- **Error Recovery**: Graceful handling of file system errors
- **Progress Tracking**: Real-time import and processing feedback

### **Schema Processing Engine**

- **JSON Schema Validation**: Comprehensive schema validation
- **Reference Resolution**: Handle complex schema references
- **Circular Reference Detection**: Identify and report circular dependencies
- **Performance Optimization**: Efficient parsing and analysis algorithms

### **Editor Integration**

- **Monaco Editor Setup**: Advanced code editing with JSON schema support
- **Syntax Highlighting**: JSON-specific highlighting and validation
- **Auto-completion**: Schema-aware auto-completion
- **Error Markers**: Real-time error highlighting and reporting

## 🚀 **Development Phases**

### **Phase 1: Foundation**

- Project module with basic file system integration
- Schema loading and basic validation
- Core UI framework and navigation

### **Phase 2: Exploration**

- Explore module with schema overview
- Basic analytics implementation
- Schema detail modal with reference navigation

### **Phase 3: Editing**

- Build module with Monaco editor integration
- Tab management system
- Real-time validation and preview

### **Phase 4: Advanced Features**

- Advanced analytics and reporting
- Performance optimizations
- Advanced editor features and customization

## 🎯 **Success Metrics**

### **Performance Targets**

- **Load Time**: < 2 seconds for projects with 100+ schemas
- **Editor Responsiveness**: < 100ms for syntax highlighting
- **Memory Usage**: Efficient memory management for large projects
- **File Operations**: < 5 seconds for RAML import operations

### **User Experience Goals**

- **Intuitive Navigation**: Users can find features within 3 clicks
- **Error Recovery**: 95% of errors handled gracefully with clear feedback
- **Cross-module Consistency**: Real-time updates work seamlessly
- **Accessibility**: WCAG 2.1 AA compliance

This project overview provides the foundation for building a powerful, user-friendly JSON schema editor that meets the needs of developers and data architects working with complex schema ecosystems.
