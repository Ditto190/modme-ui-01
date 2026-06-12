import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Include all test files from all packages (monorepo-wide)
    include: [
      'apps/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'apps/**/*.unit.test.{ts,tsx}',
      'apps/**/*.integration.test.{ts,tsx}',
      'packages/**/*.unit.test.{ts,tsx}',
      'packages/**/*.integration.test.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.turbo', 'coverage', 'test-results'],
    // Output single consolidated JSON for the entire monorepo
    outputFile: {
      json: './test-results/results.json',
    },
    reporters: ['default', 'json'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'tests/', 'dist/', '**/*.d.ts', '**/*.config.*', 'coverage/**'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'node22',
  },
});
