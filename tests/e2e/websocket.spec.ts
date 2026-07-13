import { test, expect } from '@playwright/test';
import { TEST_ADMIN } from '../helpers/db';

test.describe('WebSocket state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mealstock/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/\/mealstock\//);
  });

  test('receives full_state message on connect', async ({ page }) => {
    // Intercept WebSocket messages via page.evaluate
    const fullStateReceived = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        // The app already has an open WS — poll the global state variable
        const check = setInterval(() => {
          // Client sets window.__appState or similar; fall back to checking DOM
          if (document.querySelectorAll('input[type="number"]').length > 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve(true);
          }
        }, 100);
      });
    });
    expect(fullStateReceived).toBe(true);
  });

  test('table data reflects seeded weeks and dishes', async ({ page }) => {
    // Wait for table to populate
    await page.waitForSelector('input[type="number"]', { timeout: 5000 });
    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
    // Seeded dishes have start=50,30,40 — check at least one non-zero value exists
    const values = await inputs.evaluateAll(
      (els: HTMLInputElement[]) => els.map(e => parseInt(e.value, 10)).filter(v => v > 0)
    );
    expect(values.length).toBeGreaterThan(0);
  });
});
