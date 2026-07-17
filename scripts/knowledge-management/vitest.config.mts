import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'knowledge-management',
    globals: true,
    environment: 'node',
    setupFiles: ['./embeddings/setup.ts'],
    include: ['embeddings/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
