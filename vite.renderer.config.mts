import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  envPrefix: ['VITE_'],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
    fs: { strict: false },
  },
  optimizeDeps: {
    force: false,
    include: ['monaco-editor'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: { format: 'es' },
    },
  },
  define: {
    'process.env': {},
    // Configure Monaco Editor to use local assets instead of CDN
    'process.env.MONACO_EDITOR_CDN': JSON.stringify(false),
  },
  assetsInclude: ['**/*.otf', '**/*.ttf', '**/*.woff', '**/*.woff2'],
});
