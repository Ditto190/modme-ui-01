import type { Page } from "@playwright/test";

/**
 * Sign in test user via credentials form
 * User: dev@modme.local / devpassword
 * Auth.js middleware redirects unauthenticated requests to /sign-in
 */
export async function signIn(page: Page) {
  // Navigate to app; Auth.js middleware will redirect to /sign-in if needed
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Wait for sign-in page
  await page.waitForURL("/sign-in", { timeout: 5000 });

  // Fill credentials using data-testid selectors
  // Form inputs are in next-forge/apps/web/app/sign-in/page.tsx
  await page.fill('[data-testid="email-input"]', "dev@modme.local");
  await page.fill('[data-testid="password-input"]', "devpassword");
  await page.click('[data-testid="signin-button"]');

  // Wait for redirect to catalog page (success indicator)
  await page.waitForURL("/en/catalog", { timeout: 5000 });
}
