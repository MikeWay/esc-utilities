import { test, expect, Page } from '@playwright/test';
import { adminLogon, checkInAllBoats, logInToAppIfNeeded } from './e2eTestUtils';

const ADMIN_URL = 'http://localhost:3000/admin';
const APP_URL = 'http://localhost:4200/';

async function resetAllBoats(page: Page) {
  await adminLogon(page);
  await page.goto(ADMIN_URL);
  await page.getByRole('button', { name: 'Check In All Boats' }).click();
}

async function openAppAndChooseCheckOut(page: Page) {
  await page.goto(APP_URL);
  await page.getByRole('radio', { name: 'Check Out' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
}

async function selectBoatAndUser(page: Page, boatName: string, userInitial: string) {
  await logInToAppIfNeeded(page);
  await page.getByRole('option', { name: boatName }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('option', { name: userInitial }).click();
}

async function selectDate(page: Page, day: string, month: string) {
  await page.getByRole('combobox', { name: 'Day of Month' }).locator('span').click();
  await page.getByRole('option', { name: day }).click();
  await page.getByText('Select month').click();
  await page.getByRole('option', { name: month }).click();
  await page.getByRole('button', { name: 'Next' }).click();
}

test('check the e2e flow for check out (leaves Spare Rib checked out)', async ({ page }) => {
  await checkInAllBoats(page);
  await resetAllBoats(page);
  await openAppAndChooseCheckOut(page);

  await selectBoatAndUser(page, 'Spare Rib', 'w');
  await selectDate(page, '14', 'July');

  await page.getByRole('option', { name: 'Sailability' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Check-Out Complete')).toBeVisible();
  await expect(page.getByText('Mike Way')).toBeVisible();
  await expect(page.getByText('Spare Rib')).toBeVisible();

  await page.goto(ADMIN_URL);
  await page.getByRole('link', { name: 'Show Boats Currently Checked Out' }).click();
  await expect(page.getByRole('cell', { name: 'Spare Rib' })).toBeDefined();
});

test('check that it fails if non-existent user specified', async ({ page }) => {
  await resetAllBoats(page);
  await openAppAndChooseCheckOut(page);

  await selectBoatAndUser(page, 'Spare Rib', 'w');

  await page.getByRole('combobox', { name: 'Day of Month' }).locator('span').click();
  await page.getByRole('option', { name: '13' }).click();
  await page.getByText('Select month').click();
  await page.getByRole('option', { name: 'July' }).click();

  await expect(page.getByRole('button', { name: 'Next' })).not.toBeEnabled();
});

test('check that previous is enabled from the boat selection screen', async ({ page }) => {
  await resetAllBoats(page);
  await openAppAndChooseCheckOut(page);
  await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
});

test('check that the state is remembered when returning to the check in/out screen', async ({ page }) => {
  await page.goto(APP_URL);
  await page.getByRole('radio', { name: 'Check Out' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('radio', { name: 'Check Out' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Check In' })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
});

test('check that the next and previous buttons are disabled after checkout', async ({ page }) => {
  await resetAllBoats(page);
  await openAppAndChooseCheckOut(page);

  await selectBoatAndUser(page, 'Spare Rib', 'w');
  await selectDate(page, '14', 'July');
  await page.getByRole('option', { name: 'Dinghy Racing' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  
});

test('check that next button is enabled when checkout is selected after a checkout / checkin cycle', async ({ page }) => {
  await resetAllBoats(page);
  await openAppAndChooseCheckOut(page);

  await selectBoatAndUser(page, 'Spare Rib', 'w');
  await selectDate(page, '14', 'July');
  await page.getByRole('option', { name: 'Dinghy Racing' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('radio', { name: 'Check In' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('option', { name: 'Spare Rib' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'I am Mike Way.' }).check();
  await page.getByRole('checkbox', { name: 'I have returned the key.' }).check();
  await page.getByRole('checkbox', { name: 'I have refueled the boat.' }).check();
  
  await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();
  await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();
  await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();
  
  await page.getByRole('spinbutton', { name: 'Minutes' }).click();
  await page.getByRole('spinbutton', { name: 'Minutes' }).click();
  
  await page.getByRole('radio', { name: 'No' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('radio', { name: 'Check Out' }).click();
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
});
