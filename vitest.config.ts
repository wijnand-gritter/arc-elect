import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000, // 10 seconds max per test
    hookTimeout: 5000, // 5 seconds for setup/teardown
    teardownTimeout: 5000,
    bail: 1, // Stop on first failure to prevent hanging
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Prevent race conditions
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@main': resolve(__dirname, './src/main'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
});
