// UI fixes from docs/ui-review.md. Each test fails on the version before those fixes.
import { test, expect, nav, addRecord } from './fixtures';

test('phone top bar shows words, not bare symbols, and search fits on one line', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 });
  const bar = app.locator('#topbar');
  const visible = await bar.innerText();
  for (const word of ['Menu', 'Privacy', 'Backup', 'Print']) expect(visible).toContain(word);
  const search = bar.getByRole('button', { name: 'Search your plan' });
  const box = await search.boundingBox();
  expect(box!.height).toBeLessThan(60);
  // Full names stay as accessible names.
  await expect(bar.getByRole('button', { name: 'Export backup' })).toBeVisible();
  expect(await app.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await app.setViewportSize({ width: 320, height: 700 });
  expect(await app.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('privacy mode says so on screen and can be turned off from the banner', async ({ app }) => {
  await addRecord(app, 'Home and utilities', { 'Utility, property, or service': 'Water main', 'Shutoff, key, or access location': 'Basement north wall' });
  await app.getByRole('button', { name: 'Privacy mode' }).click();
  const banner = app.locator('.banner').filter({ hasText: 'Privacy mode is on' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Show hidden details' }).click();
  await expect(banner).toHaveCount(0);
  await expect(app.getByText('Basement north wall')).toBeVisible();
  await expect(app.getByRole('button', { name: 'Privacy mode' })).toHaveAttribute('aria-pressed', 'false');
});

test('overview buttons say where they lead instead of "Go"', async ({ app }) => {
  await expect(app.locator('.req-list').getByRole('button', { name: 'Go', exact: true })).toHaveCount(0);
  await expect(app.locator('.req-list').first().getByRole('button', { name: /^Open Trusted contacts/ })).toBeVisible();
});

test('section pages show entries before creator controls; filter appears only for long lists', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Only Person' });
  await expect(app.getByLabel('Filter people')).toHaveCount(0);
  const heading = await app.getByRole('heading', { name: 'Only Person' }).boundingBox();
  const status = await app.getByLabel('Section status').boundingBox();
  expect(status!.y).toBeGreaterThan(heading!.y);
  for (const n of [2, 3, 4, 5, 6]) await addRecord(app, 'People', { 'Full name': `Person ${n}` });
  await expect(app.getByLabel('Filter people')).toBeVisible();
});

test('help text and record labels are at least 13px', async ({ app }) => {
  await nav(app, 'Settings and backup');
  const help = await app.locator('.help').first().evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
  expect(help).toBeGreaterThanOrEqual(14);
  await addRecord(app, 'People', { 'Full name': 'Label Check', Phone: '555-0100' });
  const dt = await app.locator('.record-data dt').first().evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
  expect(dt).toBeGreaterThanOrEqual(13);
});
