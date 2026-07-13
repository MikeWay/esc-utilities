import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/helpers/playwrightSetup.ts',
  use: { baseURL: 'http://localhost:3002' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: [
      'DB_NAME=mealstock_test',
      'PORT=3002',
      'BASE_PATH=/mealstock',
      'SESSION_SECRET=test-secret-pw',
      'NODE_ENV=test',
      'node dist/server.js',
    ].join(' '),
    url: 'http://localhost:3002/mealstock/login',
    reuseExistingServer: false,
    timeout: 20000,
  },
});
