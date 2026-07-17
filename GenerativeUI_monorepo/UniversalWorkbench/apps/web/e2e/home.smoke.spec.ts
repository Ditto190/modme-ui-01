import { expect, test } from '@playwright/test';

test.describe('UniversalWorkbench web smoke', () => {
  test('home page renders hero and primary navigation', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /welcome to the adaptive template/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /stack overview/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /view users/i })).toBeVisible();
  });
});
