import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node20',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.ts'),
        preload: path.resolve(__dirname, 'src/preload.ts')
      },
      output: {
        entryFileNames: '[name].js',
        format: 'cjs'
      },
      external: ['electron']
    }
  },
  resolve: {
    alias: {
      '@gridforge/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@gridforge/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@gridforge/module-host': path.resolve(__dirname, '../../packages/module-host/src/index.ts'),
      '@gridforge/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src/index.ts'),
      '@gridforge/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@gridforge/grid': path.resolve(__dirname, '../../packages/grid/src/index.ts'),
      '@gridforge/bridge-service': path.resolve(__dirname, '../../packages/bridge-service/src/index.ts')
    },
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json']
  }
});
