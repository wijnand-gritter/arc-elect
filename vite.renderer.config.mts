import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const projectRootDir = path.resolve(__dirname, '..'); // root van je project
const rendererPath = path.resolve(projectRootDir, 'src/renderer');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': rendererPath,
    },
  },
  envPrefix: ['VITE_'],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
    fs: { strict: false },
  },
  optimizeDeps: { force: false },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: { format: 'es' },
    },
  },
  define: {
    'process.env': {},
  },
});
