import { test, expect } from '@playwright/test';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mealstock/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
  });

  test('successful login redirects to app', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/\/mealstock\//);
  });

  test('wrong password shows error', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[name="password"], input[type="password"]', 'WrongPass1!');
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/login/);
  });

  test('unknown email shows error', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', 'nobody@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/login/);
  });

  test('regular user can log in', async ({ page }) => {
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/\/mealstock\//);
  });
});

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mealstock/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"], input[type="submit"]');
    await expect(page).toHaveURL(/\/mealstock\//);
  });

  test('logout redirects to login page', async ({ page }) => {
    await page.click('button[data-action="logout"], form[action*="logout"] button, a[href*="logout"]');
    await expect(page).toHaveURL(/login/);
  });
});
