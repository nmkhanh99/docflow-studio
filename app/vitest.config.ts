import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@adapters': resolve(__dirname, 'src/adapters'),
      '@infra': resolve(__dirname, 'src/infra'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@ui': resolve(__dirname, 'src/ui')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false,
    passWithNoTests: false
  }
});
