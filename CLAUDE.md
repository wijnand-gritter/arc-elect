# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arc Elect is an Electron-based desktop application built with React 19, TypeScript, and modern tooling. It's designed as a schema editor and RAML import tool with comprehensive documentation generation capabilities.

## Development Commands

### Core Commands

```bash
# Development
pnpm run dev                 # Start development server with hot reload
pnpm run start              # Alias for dev

# Building & Packaging
pnpm run build              # Create production build
pnpm run package            # Package app for distribution
pnpm run make               # Create platform-specific distributables

# Testing
pnpm run test               # Run unit tests with Vitest
pnpm run test:watch         # Run tests in watch mode
pnpm run test:coverage      # Run tests with coverage report
pnpm run test:e2e           # Run E2E tests with Playwright
pnpm run test:e2e:headed    # Run E2E tests in headed mode

# Code Quality
pnpm run lint               # Run ESLint
pnpm run lint:fix           # Auto-fix ESLint issues
pnpm run format             # Format code with Prettier
pnpm run format:check       # Check formatting without changes
pnpm run quality            # Run format + lint
pnpm run quality:fix        # Run format + lint:fix
pnpm run preflight          # Run quality checks + tests

# Documentation
pnpm run docs               # Generate TypeDoc documentation
pnpm run docs:clean         # Clean documentation
pnpm run docs:full          # Clean and regenerate docs

# Assets
pnpm run icons              # Generate app icons
pnpm run icons:mac          # Generate macOS-specific icons
pnpm run icons:setup        # Setup icon configurations
pnpm run icons:full         # Complete icon generation process
```

### Project-Specific Commands

```bash
# RAML Conversion
pnpm run raml:convert       # Convert RAML files to JSON Schema

# Cleanup
pnpm run clean              # Remove build artifacts
pnpm run clean:all          # Remove build artifacts and dependencies
```

## Architecture Overview

### Process Architecture

- **Main Process** (`src/main/`): Electron main process handling app lifecycle, IPC, file operations, and system integration
- **Renderer Process** (`src/renderer/`): React application running in browser context with strict security isolation
- **Preload Scripts** (`src/preload/`): Secure bridge between main and renderer processes using contextBridge

### Key Architectural Patterns

#### Secure IPC Communication

- All IPC communication goes through `src/preload/preload.ts` using `contextBridge`
- API definitions in `src/types/ipc-api.d.ts` provide type safety
- Main process handlers validate all inputs and sanitize file paths
- Never enable `nodeIntegration` - use preload scripts for secure API exposure

#### State Management

- **Global State**: Zustand store (`src/renderer/stores/useAppStore.ts`)
- **Server State**: TanStack Query for data fetching and caching
- **Settings Persistence**: electron-store via IPC bridge
- **Theme State**: Synced between Zustand store and main process settings

#### Component Architecture

- **UI Components**: shadcn/ui components in `src/renderer/components/ui/`
- **Page Components**: Route-level components in `src/renderer/pages/`
- **Layout Components**: App shell components (AppLayout, TopNavigationBar)
- **Error Boundaries**: Comprehensive error handling with fallback UI

### Security Model

- Context isolation enabled with sandbox mode
- File operations validated and logged in main process
- Path traversal protection with absolute path validation
- IPC data validation using custom validation framework
- No direct Node.js API access from renderer

## Key Technology Patterns

### Error Handling Framework

```typescript
// Main process error handling
import { withErrorHandling } from './error-handler';
ipcMain.handle('api:method', withErrorHandling(async (event, data) => {
  // Handler implementation
}, 'api:method'));

// Renderer process error handling
import { safeHandler } from './lib/error-handling';
<button onClick={safeHandler(() => { /* action */ })}>
```

### File Operations

```typescript
// Always use IPC bridge for file operations
const result = await window.api.readFile('/path/to/file');
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### Theme Management

```typescript
// Theme switching via multiple approaches
import { useTheme } from '@/components/ThemeProvider';
import { useAppStore } from '@/stores/useAppStore';

const { setTheme } = useTheme(); // Context approach
const setTheme = useAppStore((s) => s.setTheme); // Store approach
```

### State Management

```typescript
// Zustand store pattern
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // State and actions
    }),
    { name: 'app-store' },
  ),
);
```

## Development Workflow

### Code Quality Standards

- **TypeScript**: Strict configuration with no `any` types
- **Formatting**: Prettier with trailing commas and single quotes
- **Linting**: ESLint v9 with TypeScript rules and import validation
- **Commits**: Conventional commits enforced via commitlint and husky
- **Testing**: Vitest for unit tests, Playwright for E2E tests

### Pre-commit Workflow

- Husky pre-commit hooks run formatting and validation
- Commitlint validates conventional commit format
- Format on save enabled in VS Code configuration

### Build System

- **Vite**: Development server and build tool
- **electron-forge**: Packaging and distribution
- **TypeScript**: Strict type checking across all processes
- **Tailwind CSS**: Utility-first styling with CSS variables for theming

## Project-Specific Context

### RAML Import System

The application includes a sophisticated RAML to JSON Schema conversion system:

- Batch conversion with progress tracking
- Comprehensive error reporting and validation
- Project-based organization with metadata persistence

### Schema Editor Features

- Monaco Editor integration for JSON Schema editing
- Real-time validation using AJV
- Template-based schema creation
- Project-based file organization

### Performance Monitoring

- Custom performance monitoring in main process
- Checkpoint-based timing for optimization
- Development-only DevTools integration

## Development Environment Setup

### VS Code Configuration

- Debug configurations for main and renderer processes
- Recommended extensions for Electron + React development
- Auto-formatting and ESLint integration
- TypeScript IntelliSense and auto-imports

### Required Extensions

- Prettier for code formatting
- ESLint for code quality
- Tailwind CSS IntelliSense
- TypeScript support

## Testing Strategy

### Unit Testing (Vitest)

- React component testing with React Testing Library
- Utility function testing
- Type-safe test configurations

### E2E Testing (Playwright)

- User workflow testing
- Cross-platform compatibility testing
- Accessibility testing integration

## Security Considerations

### Electron Security Best Practices

- Context isolation with disabled node integration
- Secure IPC communication via contextBridge
- Input validation on all IPC handlers
- File path sanitization and validation
- No arbitrary code execution from renderer

### Data Protection

- Settings encryption via electron-store
- Secure file operations with path validation
- No sensitive data exposure in renderer process

## Common Patterns to Follow

1. **File Operations**: Always use IPC bridge, never direct file system access from renderer
2. **Error Handling**: Use provided error handling framework for consistency
3. **State Management**: Use Zustand for global state, TanStack Query for server state
4. **Styling**: Use Tailwind utilities and CSS variables for theming
5. **Testing**: Write tests for new components and utilities
6. **Security**: Validate all inputs and use secure IPC patterns
7. **Performance**: Use React.memo, useCallback, and useMemo appropriately
8. **Accessibility**: Include ARIA attributes and semantic HTML

## Documentation

- Comprehensive TypeDoc documentation generated from code
- Developer guidelines in `01_DEV_GUIDELINES.md`
- AI persona definition in `00_AI-Persona.md`
- Cursor rules for development standards in `.cursor/rules/`
