import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { preserveSymlinks: true },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    pool: 'threads',
    setupFiles: ['src/test/setup.ts'],
  },
});
