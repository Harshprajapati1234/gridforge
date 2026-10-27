import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  },
  resolve: {
    alias: {
      '@gridforge/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@gridforge/sdk': path.resolve(__dirname, 'packages/sdk/src'),
      '@gridforge/module-host': path.resolve(__dirname, 'packages/module-host/src'),
      '@gridforge/ui-kit': path.resolve(__dirname, 'packages/ui-kit/src'),
      '@gridforge/core': path.resolve(__dirname, 'packages/core/src'),
      '@gridforge/grid': path.resolve(__dirname, 'packages/grid/src'),
      '@gridforge/formula': path.resolve(__dirname, 'packages/formula/src')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
});
