/**
 * Testing utilities for JSON Schema Editor.
 *
 * This module provides comprehensive testing utilities including custom render functions,
 * mock data generators, and testing helpers for components and hooks.
 *
 * @module TestUtils
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { ReactElement, ReactNode } from 'react';
import {
  render,
  RenderOptions,
  RenderResult,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../components/ThemeProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { Schema, Project, ValidationStatus } from '../../types/schema-editor';

/**
 * Custom render options.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial theme */
  theme?: 'light' | 'dark' | 'system';
  /** Query client options */
  queryClient?: QueryClient;
  /** Whether to wrap with providers */
  withProviders?: boolean;
}

/**
 * Test providers wrapper component.
 */
function TestProviders({
  children,
  theme = 'light',
  queryClient,
}: {
  children: ReactNode;
  theme?: 'light' | 'dark' | 'system';
  queryClient?: QueryClient;
}) {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    });

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme={theme} storageKey="test-theme">
        <ErrorBoundary>{children}</ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with providers.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderResult {
  const { theme = 'light', queryClient, withProviders = true, ...renderOptions } = options;

  if (!withProviders) {
    return render(ui, renderOptions);
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders theme={theme} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper, ...renderOptions });
}

/**
 * Create user event instance with default configuration.
 */
export function createUserEvent() {
  return userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });
}

/**
 * Mock schema data generator.
 */
export function createMockSchema(overrides: Partial<Schema> = {}): Schema {
  const id = overrides.id || `schema-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    projectId: overrides.projectId || 'test-project',
    name: overrides.name || `test-schema-${id.split('-')[1]}`,
    path: overrides.path || `/test/schemas/${id}.json`,
    relativePath: overrides.relativePath || `${id}.json`,
    content: overrides.content || {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: overrides.name || 'Test Schema',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    },
    metadata: {
      title: overrides.metadata?.title || 'Test Schema',
      description: overrides.metadata?.description || 'A test schema for unit testing',
      fileSize: overrides.metadata?.fileSize || 1024,
      lastModified: overrides.metadata?.lastModified || new Date(),
      version: overrides.metadata?.version || '1.0.0',
      ...overrides.metadata,
    },
    validationStatus: overrides.validationStatus || 'valid',
    validationErrors: overrides.validationErrors || [],
    references: overrides.references || [],
    referencedBy: overrides.referencedBy || [],
    ...overrides,
  };
}

/**
 * Mock project data generator.
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id || `project-${Math.random().toString(36).substr(2, 9)}`;
  const schemaCount = overrides.schemas?.length || 5;

  const schemas =
    overrides.schemas ||
    Array.from({ length: schemaCount }, (_, i) =>
      createMockSchema({
        id: `schema-${i}`,
        projectId: id,
        name: `test-schema-${i}`,
        path: `/test/schemas/schema-${i}.json`,
      }),
    );

  return {
    id,
    name: overrides.name || 'Test Project',
    path: overrides.path || '/test/project',
    schemas,
    createdAt: overrides.createdAt || new Date(),
    lastModified: overrides.lastModified || new Date(),
    settings: {
      theme: 'system',
      autoSave: true,
      showValidationErrors: true,
      ...overrides.settings,
    },
    ...overrides,
  };
}

/**
 * Mock multiple schemas with different validation statuses.
 */
export function createMockSchemas(count: number = 10): Schema[] {
  const statuses: ValidationStatus[] = ['valid', 'invalid', 'error', 'pending'];

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length];
    return createMockSchema({
      id: `schema-${i}`,
      name: `test-schema-${i}`,
      validationStatus: status,
      validationErrors:
        status === 'invalid' || status === 'error'
          ? [{ message: `Test error for schema ${i}`, line: 1, column: 1 }]
          : [],
    });
  });
}

/**
 * Wait for element to appear with custom timeout.
 */
export async function waitForElement(
  selector: string,
  timeout: number = 5000,
): Promise<HTMLElement> {
  return waitFor(
    () => {
      const element = screen.getByTestId(selector) || screen.getByRole(selector);
      if (!element) {
        throw new Error(`Element with selector "${selector}" not found`);
      }
      return element;
    },
    { timeout },
  );
}

/**
 * Wait for text to appear in document.
 */
export async function waitForText(text: string, timeout: number = 5000): Promise<HTMLElement> {
  return waitFor(() => screen.getByText(text), { timeout });
}

/**
 * Simulate file upload.
 */
export function simulateFileUpload(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', {
    value: files,
    writable: false,
  });

  fireEvent.change(input);
}

/**
 * Create mock file for testing.
 */
export function createMockFile(
  name: string,
  content: string,
  type: string = 'application/json',
): File {
  return new File([content], name, { type });
}

/**
 * Mock window.api for IPC testing.
 */
export function mockWindowApi() {
  const mockApi = {
    // Project operations
    createProject: jest.fn(),
    loadProject: jest.fn(),
    saveProject: jest.fn(),

    // Schema operations
    readFile: jest.fn(),
    writeFile: jest.fn(),
    validateSchema: jest.fn(),

    // RAML operations
    scanRamlFiles: jest.fn(),
    convertRamlFile: jest.fn(),
    convertRamlBatch: jest.fn(),

    // Settings
    getTheme: jest.fn(),
    setTheme: jest.fn(),

    // Analytics
    analyzeSchemas: jest.fn(),
  };

  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
  });

  return mockApi;
}

/**
 * Mock localStorage for testing.
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  const mockStorage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    length: 0,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
}

/**
 * Mock ResizeObserver for testing.
 */
export function mockResizeObserver() {
  const mockObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  Object.defineProperty(window, 'ResizeObserver', {
    value: mockObserver,
    writable: true,
  });

  return mockObserver;
}

/**
 * Mock IntersectionObserver for testing.
 */
export function mockIntersectionObserver() {
  const mockObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    trigger: (entries: IntersectionObserverEntry[]) => callback(entries),
  }));

  Object.defineProperty(window, 'IntersectionObserver', {
    value: mockObserver,
    writable: true,
  });

  return mockObserver;
}

/**
 * Mock performance.memory for testing.
 */
export function mockPerformanceMemory() {
  const mockMemory = {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  };

  Object.defineProperty(performance, 'memory', {
    value: mockMemory,
    writable: true,
  });

  return mockMemory;
}

/**
 * Test component accessibility.
 */
export async function testAccessibility(
  component: ReactElement,
  options: CustomRenderOptions = {},
) {
  const { container } = renderWithProviders(component, options);

  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button) => {
    expect(button).toHaveAttribute('type');
  });

  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    expect(img).toHaveAttribute('alt');
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach((input) => {
    const hasLabel =
      input.hasAttribute('aria-label') ||
      input.hasAttribute('aria-labelledby') ||
      container.querySelector(`label[for="${input.id}"]`);
    expect(hasLabel).toBe(true);
  });

  return container;
}

/**
 * Test keyboard navigation.
 */
export async function testKeyboardNavigation(
  component: ReactElement,
  options: CustomRenderOptions = {},
) {
  const user = createUserEvent();
  renderWithProviders(component, options);

  // Test Tab navigation
  await user.tab();
  expect(document.activeElement).toBeInTheDocument();

  // Test Enter key
  if (document.activeElement?.tagName === 'BUTTON') {
    await user.keyboard('{Enter}');
  }

  // Test Escape key
  await user.keyboard('{Escape}');

  // Test arrow keys
  await user.keyboard('{ArrowDown}');
  await user.keyboard('{ArrowUp}');
  await user.keyboard('{ArrowLeft}');
  await user.keyboard('{ArrowRight}');

  return { user };
}

/**
 * Test component with error boundary.
 */
export function testWithErrorBoundary(component: ReactElement, shouldError: boolean = false) {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  if (shouldError) {
    // Force component to throw error for testing
    const ThrowError = () => {
      throw new Error('Test error');
    };

    renderWithProviders(<ThrowError />);
    expect(errorSpy).toHaveBeenCalled();
  } else {
    renderWithProviders(component);
    expect(errorSpy).not.toHaveBeenCalled();
  }

  errorSpy.mockRestore();
}

/**
 * Create test suite for component.
 */
export function createTestSuite(
  name: string,
  component: () => ReactElement,
  tests: {
    [testName: string]: (renderResult: RenderResult) => Promise<void> | void;
  },
) {
  describe(name, () => {
    Object.entries(tests).forEach(([testName, testFn]) => {
      it(testName, async () => {
        const renderResult = renderWithProviders(component());
        await act(async () => {
          await testFn(renderResult);
        });
      });
    });

    it('should be accessible', async () => {
      await testAccessibility(component());
    });

    it('should handle keyboard navigation', async () => {
      await testKeyboardNavigation(component());
    });

    it('should handle errors gracefully', () => {
      testWithErrorBoundary(component());
    });
  });
}

// Export commonly used testing utilities
export { render, screen, fireEvent, waitFor, act, userEvent };

// Extend expect with jest-dom matchers
import '@testing-library/jest-dom';

// Setup global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset DOM
  document.body.innerHTML = '';

  // Mock console.error to avoid noise in tests
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers();
  jest.useRealTimers();
});
