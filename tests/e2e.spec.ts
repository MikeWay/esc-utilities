import { test, expect, Page } from '@playwright/test';
import { adminLogon, checkInAllBoats } from './e2eTestUtils';

const APP_URL = 'http://localhost:4200/';
const ADMIN_URL = 'http://localhost:3000/admin';

async function clickNext(page: Page) {
    await page.getByRole('button', { name: 'Next' }).click();
}

async function loginUser(page: Page, email = 'vice@exe-sailing-club.org', password = 'rowlocks') {
    await page.getByRole('radio', { name: 'Check In' }).click();
    await clickNext(page);

    const emailBox = page.getByRole('textbox', { name: 'Email' });
    await emailBox.fill(email);
    await emailBox.press('Tab');

    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    // login may navigate, use navigation guard if needed
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.getByRole('button', { name: 'Login' }).click()
    ]);

    await clickNext(page);
    await page.getByRole('button', { name: 'Home' }).click();
}

async function checkoutBoat(page: Page) {
    await page.getByRole('radio', { name: 'Check Out' }).click();
    await clickNext(page);

    await page.getByRole('option', { name: 'Yellow Rib' }).click();
    await clickNext(page);

    await page.getByRole('option', { name: 'w' }).click();

    // Day and month selection
    await page.getByRole('combobox', { name: 'Day of Month' }).locator('span').click();
    await page.getByRole('option', { name: '14' }).click();
    await page.getByText('Select month').click();
    await page.getByRole('option', { name: 'July' }).click();

    await clickNext(page);
    await page.getByRole('option', { name: 'Cruiser Racing' }).click();
    await clickNext(page);
    await page.getByRole('button', { name: 'Home' }).click();
}

async function checkinWithFaults(page: Page) {
    await page.getByRole('radio', { name: 'Check In' }).click();
    await clickNext(page);

    await page.getByRole('option', { name: 'Yellow Rib' }).click();
    await clickNext(page);

    // confirmations
    await page.getByRole('checkbox', { name: 'I am Mike Way.' }).check();
    await page.getByRole('checkbox', { name: 'I have returned the key.' }).check();
    await page.getByRole('checkbox', { name: 'I have refueled the boat.' }).check();

    await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();

    await page.getByRole('radio', { name: 'Yes' }).check();
    await clickNext(page);

    // add two faults
    await page.getByRole('option', { name: 'Engine failure' }).click();
    await page.getByRole('textbox', { name: 'Fault Detail' }).fill('Smoke!');
    await page.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('option', { name: 'Hull damage' }).click();
    await page.getByRole('textbox', { name: 'Fault Detail' }).fill('Oops sorry!');
    await page.getByRole('button', { name: 'Done' }).click();

    await clickNext(page);
}

test('create and clear faults', async ({ page }) => {
    // clear any pre-existing faults via admin
    await adminLogon(page);
    await checkInAllBoats(page);
    await page.goto('http://localhost:3000/admin');
    await page.getByRole('button', { name: /Clear all Boat Faults/i }).click();

    // create a booking with faults
    await page.goto(APP_URL);
    await loginUser(page);
    await checkoutBoat(page);
    await checkinWithFaults(page);

    // verify faults in admin UI and clear them
    await page.goto(ADMIN_URL);
    await page.getByRole('link', { name: 'Boats with Issues' }).click();

    // expect a count cell "2" (two faults)
    await expect(page.getByRole('cell', { name: '2' })).toBeVisible();

    await page.getByRole('link', { name: 'View Issues' }).click();

    const smokeCell = page.getByRole('cell', { name: 'Smoke!' });
    const oopsCell = page.getByRole('cell', { name: 'Oops sorry!' });
    await expect(smokeCell).toBeVisible();
    await expect(oopsCell).toBeVisible();

    // Clear Hull damage
    await page.getByRole('row', { name: 'Hull damage Oops sorry! Clear' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Yes' }).click();

    // Clear Engine failure
    await page.getByRole('row', { name: 'Engine failure Smoke! Clear' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Yes' }).click();

    // final state: all boats OK
    await expect(page.getByRole('heading', { name: 'All boats are OK!' })).toBeVisible();
});
