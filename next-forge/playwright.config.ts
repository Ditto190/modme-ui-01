import { defineConfig, devices } from "@playwright/test";

/** ModMe next-forge dev ports — see docs/codebase/STACK.md */
const APP_BASE_URL = process.env.PLAYWRIGHT_APP_URL ?? "http://localhost:3100";
const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_URL ?? "http://localhost:3101";
const API_BASE_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3102";

/**
 * Playwright configuration for next-forge E2E tests.
 * Dev servers must be started separately: `bun run dev:core` (ports 3100–3102).
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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web",
      testMatch: "catalog.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: WEB_BASE_URL,
      },
    },
    {
      name: "app",
      testMatch: "generative-ui.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: APP_BASE_URL,
      },
    },
    {
      name: "api",
      testMatch: "inbox-api.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: API_BASE_URL,
      },
    },
  ],
  timeout: 30_000,
  expect: { timeout: 5000 },
});
