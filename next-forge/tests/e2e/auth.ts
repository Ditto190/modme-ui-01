import type { Page } from "@playwright/test";

const DEV_EMAIL = "dev@modme.local";
const DEV_PASSWORD = "devpassword";
const LEADING_SLASH_RE = /^\//;

/**
 * Sign in on apps/web (port 3101) via data-testid form.
 * Redirects to /en/catalog on success.
 */
export async function signIn(page: Page) {
  await signInWeb(page);
}

/** Sign in on apps/web (port 3101) — catalog E2E. */
export async function signInWeb(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForURL("/sign-in", { timeout: 5000 });

  await page.fill('[data-testid="email-input"]', DEV_EMAIL);
  await page.fill('[data-testid="password-input"]', DEV_PASSWORD);
  await page.click('[data-testid="signin-button"]');

  await page.waitForURL("/en/catalog", { timeout: 5000 });
}

/**
 * Sign in on apps/app (port 3100) via @repo/auth SignIn form.
 * Navigates to redirectPath after auth (default "/").
 */
export async function signInApp(page: Page, redirectPath = "/") {
  await page.goto(redirectPath, { waitUntil: "domcontentloaded" });

  if (page.url().includes("/sign-in")) {
    await page.fill("#email", DEV_EMAIL);
    await page.fill("#password", DEV_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
      timeout: 10_000,
    });
  }

  if (!page.url().includes(redirectPath.replace(LEADING_SLASH_RE, ""))) {
    await page.goto(redirectPath, { waitUntil: "domcontentloaded" });
  }
}
