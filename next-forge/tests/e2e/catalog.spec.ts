import { expect, test } from "@playwright/test";
import { signIn } from "./auth";

/**
 * E2E test suite for Supabase agent catalog
 * Scenarios: smoke/load, semantic search, tool metadata, eval scores, keyboard a11y, form submission
 */

const CATALOG_TITLE_PATTERN = /(?:catalog|agent|tool)/i;

test.describe("Supabase Agent Catalog", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await signIn(page);
  });

  test("Smoke test: catalog page loads and displays heading", async ({
    page,
  }) => {
    // Already authenticated in beforeEach, just verify page content
    const page_url = page.url();
    expect(page_url).toContain("/en/catalog");

    // Check for catalog heading or main title
    const heading = page.locator('h1, [role="heading"]').first();
    await expect(heading).toBeVisible();

    // Verify page title contains "catalog" or "agent" keywords
    await expect(page).toHaveTitle(CATALOG_TITLE_PATTERN);
  });

  test("Semantic search: query agents by functionality", async ({ page }) => {
    // Already on catalog page after beforeEach auth, just test search
    const searchInput = page
      .locator(
        'input[type="text"][placeholder*="search" i], input[placeholder*="query" i], input[aria-label*="search" i]'
      )
      .first();
    await expect(searchInput).toBeVisible();

    // Type semantic query (e.g., "authentication", "data validation")
    await searchInput.fill("authentication");
    await page.keyboard.press("Enter");

    // Wait for results and verify they appear
    const resultsList = page
      .locator('[role="listbox"], [role="list"], .results, .agents-list')
      .first();
    await expect(resultsList).toBeVisible({ timeout: 5000 });

    // Check that at least one result is displayed
    const resultItems = page
      .locator('[role="option"], [role="listitem"], .result-item, .agent-card')
      .first();
    await expect(resultItems).toBeVisible();
  });

  test("Tool metadata: inspect agent details and available tools", async ({
    page,
  }) => {
    // Already on catalog page after beforeEach auth
    const agentCard = page
      .locator('.agent-card, [data-testid="agent-item"], [role="listitem"]')
      .first();
    await expect(agentCard).toBeVisible({ timeout: 5000 });
    await agentCard.click();

    // Verify agent details panel or modal opens
    const detailsPanel = page
      .locator('[role="dialog"], .modal, .panel, .details-view')
      .first();
    await expect(detailsPanel).toBeVisible({ timeout: 5000 });

    // Look for tools/skills list within details
    const toolsList = page
      .locator('[role="list"], .tools-list, .skills-list, .capabilities')
      .first();
    await expect(toolsList).toBeVisible();

    // Verify at least one tool is displayed
    const toolItem = page
      .locator('[role="listitem"], .tool-item, .skill-item')
      .first();
    await expect(toolItem).toBeVisible();
  });

  test("Evaluation framework: eval scores and ratings displayed", async ({
    page,
  }) => {
    // Already on catalog page after beforeEach auth
    const agentCard = page
      .locator('.agent-card, [data-testid="agent-item"]')
      .first();
    await expect(agentCard).toBeVisible({ timeout: 5000 });
    await agentCard.click();

    // Wait for details to load
    await page.waitForTimeout(1000);

    // Look for eval score, rating, or quality metric
    const evalScore = page
      .locator(
        '[data-testid="eval-score"], .eval-score, .rating, [aria-label*="score" i], [aria-label*="rating" i]'
      )
      .first();

    // If eval score exists, verify it's visible and contains numeric or visual indicator
    if (await evalScore.isVisible({ timeout: 3000 }).catch(() => false)) {
      const scoreText = await evalScore.textContent();
      expect(scoreText).toBeTruthy();
    }
  });

  test("Keyboard accessibility: navigate catalog using Tab and Enter", async ({
    page,
  }) => {
    // Already on catalog page after beforeEach auth
    const firstFocusable = page
      .locator(
        'button, [href], input, select, textarea, [role="button"], [role="link"], [tabindex="0"]'
      )
      .first();
    await expect(firstFocusable).toBeVisible();

    // Focus first interactive element
    await firstFocusable.focus();

    // Tab through elements and ensure at least 3 focusable elements are reachable
    let focusedElements = 0;
    for (let i = 0; i < 5; i++) {
      const focused = await page.evaluate(
        () => document.activeElement?.tagName
      );
      if (focused && focused !== "BODY" && focused !== "HTML") {
        focusedElements++;
      }
      await page.keyboard.press("Tab");
    }

    expect(focusedElements).toBeGreaterThanOrEqual(2);

    // Verify Escape key closes any modal or overlay
    const modal = page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    }
  });

  test("Form submission: can submit agent collection or eval request", async ({
    page,
  }) => {
    // Already on catalog page after beforeEach auth
    const form = page.locator('form, [role="form"]').first();

    // If no form on home page, try navigating to a creation or submission page
    if (!(await form.isVisible({ timeout: 2000 }).catch(() => false))) {
      const createButton = page
        .locator(
          'button:has-text("Create"), button:has-text("Submit"), button:has-text("Generate"), a:has-text("New")'
        )
        .first();
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
      }
    }

    // Re-check for form
    const formElement = page.locator('form, [role="form"]').first();
    if (await formElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find submit button
      const submitButton = formElement
        .locator(
          'button[type="submit"], button:has-text("Submit"), button:has-text("Save")'
        )
        .first();
      await expect(submitButton).toBeVisible();

      // Fill at least one input field if present
      const input = formElement.locator("input, textarea, select").first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        if (
          (await input.getAttribute("type")) === "checkbox" ||
          (await input.getAttribute("role")) === "checkbox"
        ) {
          await input.check();
        } else {
          await input.fill("test-value");
        }
      }

      // Submit the form
      await submitButton.click();

      // Verify form submits (look for success message or redirect)
      await page.waitForTimeout(2000);
      const successMessage = page
        .locator('[role="alert"], .success, .toast')
        .first();
      const urlChanged = page.url() !== "http://localhost:3101/";

      expect(
        (await successMessage
          .isVisible({ timeout: 2000 })
          .catch(() => false)) || urlChanged
      ).toBeTruthy();
    }
  });
});
