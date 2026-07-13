import { test, expect } from '@playwright/test';
import { TEST_ADMIN } from '../helpers/db';

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
    // Find the first numeric input (start column for first dish)
    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.fill('99');
    // Trigger blur to save
    await input.press('Tab');
    // Value should persist (no page reload needed for in-memory check)
    await expect(input).toHaveValue('99');
  });
});
