import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/core'),
        '@adapters': resolve(__dirname, 'src/adapters'),
        '@infra': resolve(__dirname, 'src/infra'),
        '@preload': resolve(__dirname, 'src/preload')
      }
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/core'),
        '@infra': resolve(__dirname, 'src/infra'),
        '@preload': resolve(__dirname, 'src/preload')
      }
    },
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/ui'),
    plugins: [react()],
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/core'),
        '@ui': resolve(__dirname, 'src/ui'),
        '@preload': resolve(__dirname, 'src/preload')
      }
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/ui/index.html')
        }
      }
    }
  }
});
