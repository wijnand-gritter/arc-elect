import '@testing-library/jest-dom';
// Mock window.api for tests that might touch IPC
Object.defineProperty(window, 'api', {
  value: {
    selectFolder: async () => ({ success: false }),
    loadProject: async () => ({ success: false }),
    setTheme: async () => ({ success: true }),
    getTheme: async () => ({ success: true, theme: 'light' }),
    deleteProject: async () => ({ success: true }),
  },
  writable: true,
});
