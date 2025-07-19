import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  envPrefix: ['VITE_'], // Ensure VITE_ variables are exposed

  // Development server optimizations
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    // Performance optimizations
    fs: {
      strict: false,
    },
  },

  // Optimize dependencies for faster startup
  optimizeDeps: {
    force: false,
  },

  // Disable source maps in development for faster builds
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },

  // Ensure proper ES module support
  define: {
    'process.env': {},
  },
});
