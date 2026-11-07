import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, nav, addRecord, storedPlan } from './fixtures';
import type { Page } from '@playwright/test';

async function restoreFile(page: Page, path: string) {
  await nav(page, 'Settings and backup');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Restore from file' }).click()]);
  await chooser.setFiles(path);
}

function tmpFile(name: string, text: string) {
  const p = join(mkdtempSync(join(tmpdir(), 'fcp-')), name);
  writeFileSync(p, text);
  return p;
}

test('export and restore round trip with preview and confirmation', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Alex Morgan', 'Address': '123 Example Street' });
  await nav(app, 'Settings and backup');
  const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Export backup' }).last().click()]);
  expect(dl.suggestedFilename()).toMatch(/^family-continuity-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  expect(exported.schema).toBe('family-continuity-planner');
  expect(exported.records.people[0].name).toBe('Alex Morgan');

  // Change the plan, then restore the backup.
  await addRecord(app, 'People', { 'Full name': 'Added later' });
  await restoreFile(app, await dl.path());
  const dialog = app.getByRole('dialog', { name: 'Review backup before restoring' });
  await expect(dialog.getByText('No problems were found in the file.')).toBeVisible();
  await expect(dialog.getByText(/Your current plan has 2 entries/)).toBeVisible();
  const replace = dialog.getByRole('button', { name: 'Replace my plan' });
  await expect(replace).toBeDisabled();
  // Offer to export the current plan first.
  await Promise.all([app.waitForEvent('download'), dialog.getByRole('button', { name: 'Export my current plan first' }).click()]);
  await dialog.getByLabel(/I understand this replaces/).check();
  await replace.click();
  await nav(app, 'People');
  await expect(app.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await expect(app.getByRole('heading', { name: 'Added later' })).toHaveCount(0);
});

test('cancelling a restore changes nothing', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Keep me' });
  await restoreFile(app, 'tests/fixtures/legacy-v1-export.json');
  await app.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  const plan = await storedPlan(app);
  expect(plan.records.people.map((p: { name: string }) => p.name)).toEqual(['Keep me']);
});

test('backups from the original v1 app restore with a migration preview', async ({ app }) => {
  await restoreFile(app, 'tests/fixtures/legacy-v1-export.json');
  const dialog = app.getByRole('dialog', { name: 'Review backup before restoring' });
  await expect(dialog.getByText('Original app (version 1), will be upgraded')).toBeVisible();
  await expect(dialog.getByText(/Converted the plan from the original format/)).toBeVisible();
  await expect(dialog.getByRole('row', { name: /People 2/ })).toBeVisible();
  await dialog.getByLabel(/I understand/).check();
  await dialog.getByRole('button', { name: 'Replace my plan' }).click();
  await nav(app, 'Emergency plans');
  await expect(app.getByRole('heading', { name: 'Power outage' })).toBeVisible();
});

test('invalid files are rejected with a clear message and the plan is untouched', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Untouched' });
  await restoreFile(app, tmpFile('broken.json', '{ not json'));
  await expect(app.getByRole('alert')).toContainText('could not be read');
  await restoreFile(app, tmpFile('future.json', JSON.stringify({ schema: 'family-continuity-planner', schemaVersion: 99 })));
  await expect(app.getByRole('alert')).toContainText('newer version');
  expect((await storedPlan(app)).records.people[0].name).toBe('Untouched');
});

test('a malicious backup cannot run script (v1 executed this)', async ({ app }) => {
  const v1 = JSON.parse(readFileSync('tests/fixtures/legacy-v1-export.json', 'utf8'));
  v1.people[0].id = 'x" autofocus onfocus="window.__xss=1" tabindex="0';
  v1.people[0].name = '<img src=x onerror="window.__xss=2">';
  v1.meta.householdName = '<script>window.__xss=3</script>';
  await restoreFile(app, tmpFile('evil.json', JSON.stringify(v1)));
  const dialog = app.getByRole('dialog');
  await expect(dialog.getByText(/unsafe record ID/)).toBeVisible();
  await dialog.getByLabel(/I understand/).check();
  await dialog.getByRole('button', { name: 'Replace my plan' }).click();
  await nav(app, 'People');
  await expect(app.getByRole('heading', { name: '<img src=x onerror="window.__xss=2">' })).toBeVisible();
  await app.getByRole('button', { name: /^Edit </ }).focus();
  expect(await app.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('printed packet: Start Here first, private details withheld by default, controls removed', async ({ app }) => {
  await addRecord(app, 'Accounts', { 'Institution or service': 'Sample Credit Union', 'Last four digits or safe hint': 'ends 0000', 'Where access instructions are stored': 'Password manager' });
  await addRecord(app, 'Emergency plans', { 'Plan name': 'Power outage', 'When to use this plan': 'Power out', 'Steps, one per line': 'Check breakers\nCall utility' });
  await app.getByRole('button', { name: 'Print' }).first().click();
  const dialog = app.getByRole('dialog', { name: 'Print the continuity packet' });
  await expect(dialog.getByLabel('Include private details')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Print' }).click();
  await expect.poll(() => app.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  const packet = app.locator('#print-packet');
  const content = await packet.evaluate((n) => n.textContent ?? '');
  expect(content).toContain('Printed on');
  expect(content).toContain('Check that this is current');
  expect(content.indexOf('Start here')).toBeLessThan(content.indexOf('Immediate actions'));
  expect(content.indexOf('Immediate actions')).toBeLessThan(content.indexOf('Trusted contacts'));
  expect(content).toContain('Withheld from this printout (private)');
  expect(content).not.toContain('ends 0000');
  expect(content).toContain('First 24 hours');

  // Print media hides the app and shows only the packet.
  await app.emulateMedia({ media: 'print' });
  await expect(app.locator('#app')).toBeHidden();
  await expect(packet).toBeVisible();
  const pdf = await app.pdf({ format: 'Letter' });
  expect(pdf.byteLength).toBeGreaterThan(1000);
  await app.emulateMedia({ media: 'screen' });

  await app.getByRole('button', { name: 'Print' }).first().click();
  await app.getByRole('dialog').getByLabel('Include private details').check();
  await app.getByRole('dialog').getByRole('button', { name: 'Print' }).click();
  await expect.poll(() => packet.evaluate((n) => n.textContent ?? '')).toContain('ends 0000');
});

test('keyboard only: add a record from the navigation without a mouse', async ({ app }) => {
  await app.keyboard.press('Tab'); // skip link
  await expect(app.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const people = app.locator('#nav').getByRole('button', { name: /^People/ });
  await people.focus();
  await app.keyboard.press('Enter');
  await expect(app.locator('.view-title')).toBeFocused();
  await app.locator('.page-actions').getByRole('button').focus();
  await app.keyboard.press('Enter');
  const dialog = app.getByRole('dialog');
  await expect(dialog.getByLabel('Full name')).toBeFocused();
  await app.keyboard.type('Keyboard Person');
  await app.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(app.getByRole('heading', { name: 'Keyboard Person' })).toBeVisible();
  // Escape closes dialogs and returns focus to the opener.
  const edit = app.getByRole('button', { name: 'Edit Keyboard Person' });
  await edit.focus();
  await app.keyboard.press('Enter');
  await expect(app.getByRole('dialog')).toBeVisible();
  await app.keyboard.press('Escape');
  await expect(app.getByRole('dialog')).toHaveCount(0);
  await expect(edit).toBeFocused();
});

test('mobile: closed menu is not keyboard reachable; opening and Escape work', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 });
  await expect(app.locator('#sidebar')).toHaveJSProperty('inert', true);
  const menu = app.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(app.locator('#nav [aria-current="page"]')).toBeFocused();
  await app.keyboard.press('Escape');
  await expect(app.locator('#sidebar')).toHaveJSProperty('inert', true);
  await expect(menu).toBeFocused();
  // Content fits the narrow screen without horizontal scrolling.
  expect(await app.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

const VIEWS = ['Overview', 'Get started', 'Start Here', 'Who handles what', 'People', 'Accounts', 'Checklist', 'Continuity review', 'Settings and backup'];

for (const theme of ['light', 'dark'] as const) {
  test(`no automatically detectable accessibility violations (${theme})`, async ({ app }) => {
    await app.evaluate((t) => localStorage.setItem('familyContinuityPlanner.theme', t), theme);
    await nav(app, 'Settings and backup');
    await app.getByRole('button', { name: 'Load sample data' }).click();
    await app.reload();
    const results: string[] = [];
    for (const v of VIEWS) {
      await nav(app, v);
      const r = await new AxeBuilder({ page: app }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      results.push(...r.violations.map((x) => `${v}: ${x.id} (${x.nodes.length}) ${x.nodes[0]?.target}`));
    }
    await nav(app, 'People');
    await app.getByRole('button', { name: /^Edit / }).first().click();
    const d = await new AxeBuilder({ page: app }).include('dialog').analyze();
    results.push(...d.violations.map((x) => `edit dialog: ${x.id} ${x.nodes[0]?.target}`));
    expect(results).toEqual([]);
  });
}

test('the original v1 app refuses v2 backups instead of silently dropping records', async ({ page }) => {
  // Old copies of the v1 file may still exist. v1 accepted any JSON with "meta" and a
  // "checklist" array, so v2 names plan details "info" to make v1 reject the file.
  const { pathToFileURL } = await import('node:url');
  await page.goto(pathToFileURL('legacy/family-continuity-planner-recovered-v1.html').href);
  await page.setInputFiles('#importFile', 'examples/sample-plan.json');
  await expect(page.locator('#toast')).toHaveText('That file is not a valid Family Continuity backup');
  expect(await page.evaluate(() => localStorage.getItem('familyContinuityPlanner.v1'))).toBeNull();
});

test('online copy shows where data lives, and the notice can be acknowledged', async ({ browser }) => {
  // Serve the built file at the GitHub Pages address without any real network access.
  const html = readFileSync('dist/index.html', 'utf8');
  const ctx = await browser.newContext();
  const unexpected: string[] = [];
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url === 'https://graybound.github.io/family-continuity-planner/') return route.fulfill({ body: html, contentType: 'text/html' });
    unexpected.push(url);
    return route.abort();
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('https://graybound.github.io/family-continuity-planner/');
  const notice = page.locator('.banner').filter({ hasText: 'You are using the online version' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('never sent to GitHub');
  await notice.getByRole('button', { name: 'Got it' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.view-title')).toBeVisible();
  await expect(page.locator('.banner').filter({ hasText: 'online version' })).toHaveCount(0);
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('the downloaded copy does not show the online-version notice', async ({ app }) => {
  await expect(app.locator('.view-title')).toBeVisible();
  await expect(app.getByText('You are using the online version')).toHaveCount(0);
});
