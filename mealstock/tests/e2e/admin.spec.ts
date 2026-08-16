import { test, expect } from '@playwright/test';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/mealstock/login');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"], input[type="submit"]');
}

test.describe('Admin panel', () => {
  test('admin can access /admin', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/mealstock/admin');
    await expect(page.locator('h1')).toContainText('User Management');
  });

  test('regular user is denied /admin', async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/mealstock/admin');
    await expect(page).toHaveURL(/admin/);
    const text = await page.textContent('body');
    expect(text?.toLowerCase()).toContain('forbidden');
  });

  test('admin page lists all users', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/mealstock/admin');
    const text = await page.textContent('body');
    expect(text).toContain(TEST_ADMIN.email);
    expect(text).toContain(TEST_USER.email);
    expect(text).toContain('pending@test.com');
  });

  test('SQL query tool executes and shows results', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/mealstock/admin');
    const sql = page.locator('#sqlInput');
    await sql.fill('SELECT COUNT(*) AS n FROM users');
    await page.click('button:has-text("Run")');
    await expect(page.locator('#sqlResults')).toContainText('n');
  });

  test('can add a freezer option', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.goto('/mealstock/admin');
    await page.fill('input[name="label"]', 'E2E Freezer');
    await page.click('button:has-text("Add Option")');
    await expect(page).toHaveURL(/\/admin/);
    const text = await page.textContent('body');
    expect(text).toContain('E2E Freezer');
  });
});
