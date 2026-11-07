import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the built single-file app opened from disk
// (file://), the same way a regular user opens a downloaded release.
// Run `npm run build` first. Set PW_CHROMIUM_PATH to use an installed Chrome
// instead of Playwright's bundled browser.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI. Chromium occasionally loses a localStorage write made just before
  // reloading a page opened from disk (file://); see README Limitations and IMPORT_ISSUES.md.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath },
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
});
