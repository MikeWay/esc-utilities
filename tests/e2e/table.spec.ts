import { test, expect } from '@playwright/test';
import { TEST_ADMIN } from '../helpers/db';

// Wait for inputs AND confirm WS is in OPEN state (syncLabel === 'Live')
async function waitForSync(page: any) {
  await page.waitForFunction(
    () => document.querySelectorAll('input[type="number"]').length > 0 &&
          document.getElementById('syncLabel')?.textContent === 'Live',
    { timeout: 10000 }
  );
}

test.describe('Stock table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mealstock/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/\/mealstock\//);
  });

  test('renders category headers', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toContain('Meat');
    expect(text).toContain('Non-Meat');
    expect(text).toContain('Desserts');
  });

  test('renders seeded dish names', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toContain('Beef Stew');
    expect(text).toContain('Veggie Curry');
    expect(text).toContain('Apple Crumble');
  });

  test('renders all session column headers', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toContain('Tues');
    expect(text).toContain('Friday');
    expect(text).toContain('Saturday');
    expect(text).toContain('Sunday');
  });

  test('totals rows are present', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toContain('Meals Total');
    expect(text).toContain('Desserts Total');
  });

  test('start value is editable', async ({ page }) => {
    await waitForSync(page);
    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.fill('99');
    await input.press('Tab');
    await expect(input).toHaveValue('99');
  });

  // Regression test for pagehide sync: value typed but not blurred is saved on page leave
  test('pending cell edit is flushed when pagehide fires', async ({ page }) => {
    await waitForSync(page);

    // Focus the first "start" input and type a new value WITHOUT blurring
    // (using keyboard so onchange does NOT fire — only blur fires onchange)
    const input = page.locator('input[type="number"][data-field="start"]').first();
    await input.click({ clickCount: 3 }); // select all existing text
    await page.keyboard.type('73');        // type new value — input event only, not change
    await expect(input).toHaveValue('73');

    // Dispatch pagehide — our handler calls handleInput(el) → send() → ws.send(cell_update)
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });

    // Give the WebSocket a moment to deliver the message to the server
    await page.waitForTimeout(400);

    // Reload to get fresh server state — session cookie keeps us logged in
    await page.reload();
    await waitForSync(page);

    // The value must have been saved
    await expect(page.locator('input[type="number"][data-field="start"]').first()).toHaveValue('73');
  });

  // Regression test for Bug 2: "export fails for weeks beyond the first 3"
  // Root cause: exportCSV() accessed state.weeks[state.activeWeek] when stale/undefined.
  // The seed includes 2 weeks; this test switches to the second and verifies export works.
  test('export CSV downloads a file for a non-first week', async ({ page }) => {
    await waitForSync(page);

    // Seed contains Week 1 and Week 2 — confirm both tabs are visible
    await expect(page.locator('.week-tab')).toHaveCount(2, { timeout: 5000 });

    // Switch to Week 2
    await page.locator('.week-tab').nth(1).click();
    // Brief pause for activeWeek to update in state
    await page.waitForTimeout(300);

    // Export CSV on this non-first week — regression test for Bug 2
    const downloadPromise = page.waitForEvent('download', { timeout: 6000 });
    await page.click('button[onclick="exportCSV()"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
