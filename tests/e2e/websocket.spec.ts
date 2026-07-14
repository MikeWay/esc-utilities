import { test, expect, type Page } from '@playwright/test';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/mealstock/login');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"], input[type="submit"]');
  await expect(page).toHaveURL(/\/mealstock\//);
}

// Wait for inputs AND confirm WS is in OPEN state (syncLabel === 'Live')
async function waitForSync(page: Page) {
  await page.waitForFunction(
    () => document.querySelectorAll('input[type="number"]').length > 0 &&
          document.getElementById('syncLabel')?.textContent === 'Live',
    { timeout: 10000 }
  );
}

test.describe('WebSocket state', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
  });

  test('receives full_state message on connect', async ({ page }) => {
    const fullStateReceived = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        const check = setInterval(() => {
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
    await page.waitForSelector('input[type="number"]', { timeout: 5000 });
    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible();
    const values = await inputs.evaluateAll(
      (els: HTMLInputElement[]) => els.map(e => parseInt(e.value, 10)).filter(v => v > 0)
    );
    expect(values.length).toBeGreaterThan(0);
  });
});

// Regression test for Bug 1: "new week added on one browser not visible in another"
test.describe('Multi-client sync', () => {
  test('week added in one browser context appears in another', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    try {
      const page1 = await ctx1.newPage();
      const page2 = await ctx2.newPage();

      await loginAs(page1, TEST_ADMIN.email, TEST_ADMIN.password);
      await loginAs(page2, TEST_USER.email, TEST_USER.password);

      await waitForSync(page1);
      await waitForSync(page2);

      const initialTabCount = await page2.locator('.week-tab').count();

      // Admin adds a new week via the modal
      await page1.click('button[onclick="openManageWeeks()"]');
      await page1.waitForSelector('#addWeekModal', { state: 'visible' });
      const nextWeekDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await page1.fill('#newWeekDate', nextWeekDate);
      await page1.click('#addWeekModal button:has-text("Create Week")');

      // Sender's own tab should update
      await expect(page1.locator('.week-tab')).toHaveCount(initialTabCount + 1, { timeout: 6000 });

      // Other connected client must also receive the broadcast full_state — regression for Bug 1
      await expect(page2.locator('.week-tab')).toHaveCount(initialTabCount + 1, { timeout: 6000 });
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });
});
