import { Page } from "@playwright/test";

export async function checkInAllBoats(page) {
  await adminLogon(page);
  await page.goto('http://localhost:3000/admin');
  await page.getByRole('button', { name: 'Check In All Boats' }).click();
}
export async function adminLogon(page: any) {
  await page.goto('http://localhost:3000/admin-login');
  await page.getByRole('textbox', { name: 'Email:' }).fill('vice@exe-sailing-club.org');
  await page.getByRole('textbox', { name: 'Password:' }).fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
}
/*


            "Sailability",
            "Maintenance",
            "Dinghy Racing",
            "Dinghy Cruising",
            "Cruiser Racing",
            "Training",
            "Other"
            */
export async function downloadReport(page: Page): Promise<string> {
  await page.goto('http://localhost:3000/admin-login');
  await page.getByRole('textbox', { name: 'Email:' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('vice@exe-sailing-club.org');
  await page.getByRole('textbox', { name: 'Email:' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password:' }).fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Generate Log Reports' }).click();
  const download = await downloadPromise;

  const readStream = await download.createReadStream();

  // Read the stream into memory, split into lines and return the last non-empty line.
  const chunks: Buffer[] = [];
  for await (const chunk of readStream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const csvContent = Buffer.concat(chunks).toString('utf8');
  const lines = csvContent.split(/\r?\n/);
  // let lastLine = '';
  // for (let i = lines.length - 1; i >= 0; i--) {
  //   if (lines[i].trim() !== '') {
  //     lastLine = lines[i];
  //     break;
  //   }
  // }
  // console.log('Last line of CSV:', lastLine);
  return csvContent;
}
export async function logInToAppIfNeeded(page: Page) {
  if (await page.isVisible('#loginForm')) {
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('mikeway@webwrights.co.uk');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('rowlocks');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
}
export async function clearAllIssues(page: Page) {
  await adminLogon(page);
  await page.goto('http://localhost:3000/admin');
  await page.getByRole('button', { name: 'Clear all Boat Faults - Testing Only' }).click();
}

