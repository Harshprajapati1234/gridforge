import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  resolve: {
    alias: {
      '@gridforge/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@gridforge/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src/index.ts'),
      '@gridforge/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@gridforge/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@gridforge/grid': path.resolve(__dirname, '../../packages/grid/src/index.ts'),
      '@gridforge/formula': path.resolve(__dirname, '../../packages/formula/src/index.ts')
    },
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json']
  },
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true }
});
