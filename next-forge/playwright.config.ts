import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for next-forge E2E tests
 * Targets Supabase catalog E2E: semantic agent search, tool metadata, eval framework
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // webServer disabled — dev servers must be started separately via 'yarn dev:forge:core'
  // webServer: {
  //   command: 'yarn dev:forge:core',
  //   url: 'http://localhost:3101',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  timeout: 30_000,
  expect: { timeout: 5000 },
});
