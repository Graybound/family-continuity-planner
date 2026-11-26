import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the built single-file app opened from disk
// (file://), the same way a regular user opens a downloaded release.
// Run `npm run build` first.
//
// PW_BROWSERS picks the browsers: a comma-separated list of chromium, firefox,
// webkit, or "all". It defaults to chromium so `npm run test:e2e` keeps working
// anywhere only Chromium is installed (local setup, release.yml).
// CI sets PW_BROWSERS=all. Install the others with
// `npx playwright install firefox webkit`.
//
// Set PW_CHROMIUM_PATH to use an installed Chrome instead of Playwright's
// bundled Chromium.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

// Chromium on Linux replaces a download name it cannot encode in the locale's
// charset with "download". Under the bare C locale (some containers) that drops
// every accented name, which real desktops (UTF-8) never do. Browsers inherit this.
if (!process.env.LC_ALL && !/utf-?8/i.test(process.env.LANG ?? '')) process.env.LANG = 'C.UTF-8';

const ALL = ['chromium', 'firefox', 'webkit'] as const;
const requested = (process.env.PW_BROWSERS || 'chromium').split(',').map((b) => b.trim().toLowerCase());
const wanted = requested.includes('all') ? [...ALL] : ALL.filter((b) => requested.includes(b));
const unknown = requested.filter((b) => b !== 'all' && !(ALL as readonly string[]).includes(b));
if (unknown.length) throw new Error(`PW_BROWSERS has unknown browser(s): ${unknown.join(', ')}. Use ${ALL.join(', ')} or all.`);

const projects = {
  chromium: { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] } },
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI. Chromium occasionally loses a localStorage write made just before
  // reloading a page opened from disk (file://); see README Limitations and IMPORT_ISSUES.md.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: wanted.map((b) => projects[b]),
});
