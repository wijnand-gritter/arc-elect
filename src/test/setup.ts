import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';

// Mock window.api for all tests
const mockWindowApi = {
  // Project operations
  createProject: vi.fn(),
  loadProject: vi.fn(),
  saveProject: vi.fn(),
  deleteProject: vi.fn(),
  getRecentProjects: vi.fn(),
  
  // File operations
  readFile: vi.fn(),
  writeFile: vi.fn(),
  selectDirectory: vi.fn(),
  selectFile: vi.fn(),
  
  // Schema operations
  validateSchema: vi.fn(),
  
  // Settings operations
  getSettings: vi.fn(),
  setSetting: vi.fn(),
  
  // Import operations
  scanRamlFiles: vi.fn(),
  convertRamlFile: vi.fn(),
  convertRamlBatch: vi.fn(),
  
  // Performance monitoring
  getPerformanceMetrics: vi.fn(),
  
  // Analytics
  analyzeSchemas: vi.fn(),
};

// Mock global objects
Object.defineProperty(window, 'api', {
  value: mockWindowApi,
  writable: true,
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Extend expect with custom matchers
expect.extend({
  toHaveAccessibleName(received: Element, name: string) {
    const accessibleName = received.getAttribute('aria-label') || 
                          received.getAttribute('aria-labelledby') ||
                          received.textContent;
    
    return {
      pass: accessibleName === name,
      message: () => `Expected element to have accessible name "${name}" but got "${accessibleName}"`,
    };
  },
});

// Export mock for use in tests
export { mockWindowApi };
