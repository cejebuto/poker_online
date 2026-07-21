import { test, expect } from '@playwright/test';

/**
 * Browser smoke: SPA loads and shows connection UI.
 * Full multi-device game flow is covered by apps/api/test/e2e-flow.test.ts (CI).
 */
test('home loads and shows poker branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  // User gate or home title
  await expect(page.getByText(/Poker|Quién sos|nombre/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
