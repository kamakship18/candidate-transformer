import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(rootDir, 'front'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'front/src'),
      '@back': path.resolve(rootDir, 'back/src')
    }
  },
  test: {
    root: rootDir,
    include: ['back/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: []
  }
});
