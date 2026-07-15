import { test, expect, Page } from '@playwright/test';
import { adminLogon, checkInAllBoats, clearAllIssues, downloadReport, logInToAppIfNeeded } from './e2eTestUtils';

test.setTimeout(120_000);

const ribNames = ['Blue Rib', 'Yellow Rib', 'White Rib', 'Orange Rib', 'Grey Rib', 'Tornado II'];

async function goToApp(page: Page) {
  await page.goto('http://localhost:4200/');
}

async function pickDateSample(page: Page) {
  // encapsulate the repeated "week/day/month" selection
  await page.getByRole('option', { name: 'w' }).click();
  await page.getByRole('combobox', { name: 'Day of Month' }).locator('span').click();
  await page.getByRole('option', { name: '14' }).click();
  await page.getByText('Select month').click();
  await page.getByRole('option', { name: 'July' }).click();
}

async function checkoutFlow(page: Page, ribName: string, reason: string) {
  await goToApp(page);
  await page.getByRole('radio', { name: 'Check Out' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await logInToAppIfNeeded(page);
  await page.getByRole('option', { name: ribName }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await pickDateSample(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('option', { name: reason }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
}

async function checkinFlow(page: Page, ribName: string, opts?: { engineHours?: string; issues?: string[]; markRefueled?: boolean }) {
  const issues = opts?.issues ?? [];
  await goToApp(page);
  await page.getByRole('radio', { name: 'Check In' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('option', { name: ribName }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'I am Mike Way.' }).check();
  await page.getByRole('checkbox', { name: 'I have returned the key.' }).check();
  if (opts?.markRefueled ?? true) {
    await page.getByRole('checkbox', { name: 'I have refueled the boat.' }).check();
  }
  if (opts?.engineHours) {
    await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();

    const raw = opts.engineHours!;
    let hoursNum = 0;
    let minutesNum = 0;

    if (raw.includes(':')) {
      const [h, m] = raw.split(':').map((s) => s.trim());
      hoursNum = parseInt(h, 10) || 0;
      minutesNum = parseInt(m, 10) || 0;
    } else {
      const n = parseFloat(raw);
      if (!isNaN(n)) {
        hoursNum = Math.floor(n);
        minutesNum = Math.round((n - hoursNum) * 60);
        if (minutesNum === 60) {  
          hoursNum += 1;
          minutesNum = 0;
        }
      }
    }

    const hoursStr = String(hoursNum).padStart(2, '0');
    const minutesStr = String(minutesNum).padStart(2, '0');

    await page.getByRole('spinbutton', { name: 'Engine Hours' }).fill(hoursStr);
    await page.getByRole('spinbutton', { name: 'Minutes' }).click();
    await page.getByRole('spinbutton', { name: 'Minutes' }).fill(minutesStr);
  }
  // If there are issues, pick Yes, otherwise No
  if (issues.length > 0) {
    await page.getByRole('radio', { name: 'Yes' }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    for (const issue of issues) {
      await expect(page.getByText('Tell us')).toBeVisible();
      await page.getByRole('option', { name: issue }).click();
      await expect(page.getByText('Do you have more information')).toBeVisible();
      await page.getByRole('textbox').click();
      await page.getByRole('textbox').fill(issue + ' - details of the problem');
      await page.getByRole('button', { name: 'Done' }).click();


    }
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Thank You')).toBeVisible();
  } else {
    await page.getByRole('radio', { name: 'No' }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Thank You')).toBeVisible();
  }
}

async function getTotalEngineHours(page: Page): Promise<number> {
  await adminLogon(page);
  await page.getByRole('link', { name: 'List Engine Hours by Use', exact: true }).click();
  const textContent = await page.locator('#totalEngineHours').textContent();
  return parseFloat(textContent ?? '0');
}

test('check in all boats', async ({ page }) => {
  await checkInAllBoats(page);
});

test('full checkin-checkout flow', async ({ page }) => {
  await clearAllIssues(page);
  await checkInAllBoats(page);

  // checkout Blue Rib
  await checkoutFlow(page, 'Blue Rib', 'Sailability');

  // checkin Blue Rib with a fuel-system issue
  await checkinFlow(page, 'Blue Rib', { issues: ['Fuel system issue'] });

  // verify CSV report contents
  const csvContent: string = await downloadReport(page);
  const lines = csvContent.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() !== '');
  const lastLine = nonEmpty[nonEmpty.length - 1] ?? '';
  const penultimateLine = nonEmpty.length >= 2 ? nonEmpty[nonEmpty.length - 2] : '';

  const cols = lastLine
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((c) => c.replace(/^"(.*)"$/, '$1').trim());
  const penCols = penultimateLine
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((c) => c.replace(/^"(.*)"$/, '$1').trim());

  expect(penCols[0].toLowerCase()).toBe('check out');
  expect(cols[0].toLowerCase()).toBe('check in');
  expect(cols[1]).toBe('Blue Rib');
  expect(cols[5]).toBe('Sailability');
  expect(cols[6]).toBe('Fuel system issue');

  // verify UI issues list
  await page.getByRole('link', { name: 'Boats with Issues' }).click();
  await expect(page.getByRole('cell', { name: '1' }).nth(1)).toBeVisible();
  await page.getByRole('row', { name: 'Blue Rib 1 View Issues' }).getByRole('link').click();
  await expect(page.getByRole('cell', { name: 'Fuel system issue - details of the problem' })).toBeVisible();
});

test('Checkin Blue Rib with multiple issues', async ({ page }) => {
  await doCheckinWithIssues(page, 'Blue Rib', ['Electrical issue', 'Propeller problem']);
});

test('Checkin Blue Rib with different issues', async ({ page }) => {
  await doCheckinWithIssues(page, 'Blue Rib', ['Hull damage', 'Fuel system issue']);
});

async function doCheckinWithIssues(page: Page, ribName: string, issues: string[]) {
  await checkInAllBoats(page);
  await checkoutFlow(page, ribName, 'Sailability');
  // check in and record issues
  await checkinFlow(page, ribName, { issues });
}

test('Checkin random boats with random issues (to generate test data)', async ({ page }) => {
  const issues = ['Engine failure', 'Electrical issue', 'Hull damage', 'Propeller problem', 'Fuel system issue', 'Steering malfunction'];
  const boatsNames = ['Yellow Rib', 'Blue Rib', 'Spare Rib', 'Grey Rib'];

  for (let i = 0; i < 10; i++) {
    const randomBoat = boatsNames[Math.floor(Math.random() * boatsNames.length)];
    const randomIssues = issues.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 1);
    await doCheckinWithIssues(page, randomBoat, randomIssues);
  }
});

test('check out then in no faults - storing engine hours', async ({ page }) => {
  const startTotalEngineHours = await getTotalEngineHours(page);

  // Helper wrapper: do a checkout + checkin for a random rib with provided hours & reason
  async function checkoutThenIn(hours: string, reason: string) {
    const randomRibName = ribNames[Math.floor(Math.random() * ribNames.length)];
    console.log(`Checking out and in ${randomRibName} with ${hours} hours for reason ${reason}`);
    await checkInAllBoats(page);
    await checkoutFlow(page, randomRibName, reason);
    // when checking in, mark engine hours and no faults
    await checkinFlow(page, randomRibName, { engineHours: hours, issues: [] });
    await page.getByRole('button', { name: 'Home' }).click();
  }

  await checkoutThenIn('05:00', 'Sailability');
  await checkoutThenIn('01:20', 'Dinghy Racing');
  await checkoutThenIn('02:30', 'Dinghy Cruising');
  await checkoutThenIn('03:40', 'Cruiser Racing');
  await checkoutThenIn('04:50', 'Training');
  await checkoutThenIn('06:00', 'Other');
  await checkoutThenIn('02:00', 'Sailability');
  await checkoutThenIn('03:20', 'Dinghy Racing');
  await checkoutThenIn('01:30', 'Dinghy Cruising');
  await checkoutThenIn('01:40', 'Cruiser Racing');
  await checkoutThenIn('05:50', 'Training');
  await checkoutThenIn('01:00', 'Other');

  const endTotalEngineHours = await getTotalEngineHours(page);
  const expectedHoursToAdd = 38 + 40 / 60; // 38 + 40 minutes
  const actualHoursAdded = endTotalEngineHours - startTotalEngineHours;
  const delta = Math.abs(actualHoursAdded - expectedHoursToAdd);
  expect(delta).toBeLessThan(0.01);
});

test('check orange out and in with two faults', async ({ page }) => {
  await checkInAllBoats(page);
  await clearAllIssues(page);

  await checkoutFlow(page, 'Orange Rib', 'Cruiser Racing');

  // check in Orange with two faults
  await goToApp(page);
  await page.getByRole('radio', { name: 'Check In' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('option', { name: 'Orange Rib' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'I am Mike Way.' }).check();
  await page.getByRole('checkbox', { name: 'I have returned the key.' }).check();
  await page.getByRole('spinbutton', { name: 'Engine Hours' }).click();

  // indicate there are issues
  await page.getByRole('radio', { name: 'Yes' }).check();
  await page.getByRole('button', { name: 'Next' }).click();

  // add two issues
  await page.getByRole('option', { name: 'Engine failure' }).click();
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill('Engine dies');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('option', { name: 'Steering malfunction' }).click();
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill('Steering leaking');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Next' }).click();

  await adminLogon(page);
  await page.getByRole('link', { name: 'Boats with Issues' }).click();

  const table = page.locator('table').first();
  const rows = table.locator('tr');
  await expect(rows).toHaveCount(2); // header + one data row
  const headerCount = await table.locator('th').count();
  expect(headerCount).toBeGreaterThan(0);
  await expect(page.getByRole('cell', { name: '2' })).toBeVisible();
  await page.getByRole('row', { name: 'Orange Rib 2 View Issues' }).getByRole('link').click();
  await expect(page.getByRole('cell', { name: 'Engine dies' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Steering leaking' })).toBeVisible();
});
