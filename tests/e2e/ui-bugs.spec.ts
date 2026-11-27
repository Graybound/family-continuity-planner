// UI-side fixes for findings 6 to 12 of the bug hunt (#17). Each test fails without its fix.
import { test, expect, nav, addRecord, storedPlan, skipPdf } from './fixtures';
import type { Page } from '@playwright/test';

/** Make every later save of the plan fail as if browser storage were full. */
async function fillStorage(page: Page) {
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'familyContinuityPlanner.v2') throw new DOMException('full', 'QuotaExceededError');
      return orig.call(this, k, v);
    };
  });
}

test('record, checklist and message fields limit length to what a reload keeps', async ({ app }) => {
  await nav(app, 'Notes');
  await app.locator('.page-actions').getByRole('button').click();
  await expect(app.getByRole('dialog').getByLabel('Note')).toHaveAttribute('maxlength', '20000');
  await app.keyboard.press('Escape');
  await nav(app, 'Start Here');
  await app.getByRole('button', { name: 'Add a message' }).click();
  await expect(app.getByRole('dialog').getByLabel('Message')).toHaveAttribute('maxlength', '100000');
});

test('Escape and Cancel ask before throwing away typed text', async ({ app }) => {
  await nav(app, 'Notes');
  await app.locator('.page-actions').getByRole('button').click();
  const dialog = app.getByRole('dialog', { name: 'Add note' });
  await dialog.getByLabel('Title').fill('Router reset steps');
  await app.keyboard.press('Escape');
  const ask = app.getByRole('dialog', { name: 'Discard your changes?' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dialog.getByLabel('Title')).toHaveValue('Router reset steps');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await ask.getByRole('button', { name: 'Discard changes' }).click();
  await expect(app.getByRole('dialog')).toHaveCount(0);
  // An untouched dialog still closes at once.
  await app.locator('.page-actions').getByRole('button').click();
  await app.keyboard.press('Escape');
  await expect(app.getByRole('dialog')).toHaveCount(0);
});

test('privacy mode keeps private fields out of the edit dialog until asked, and saving keeps them', async ({ app }) => {
  await addRecord(app, 'Home and utilities', { 'Utility, property, or service': 'Water main', 'Shutoff, key, or access location': 'Basement north wall' });
  await app.getByRole('button', { name: 'Privacy mode' }).click();
  await app.getByRole('button', { name: 'Edit Water main' }).click();
  const dialog = app.getByRole('dialog');
  expect(await dialog.evaluate((d) => [...d.querySelectorAll('input, textarea')].map((n) => (n as HTMLInputElement).value).join(' ') + d.textContent)).not.toContain('Basement north wall');
  await dialog.getByRole('button', { name: 'Save' }).click();
  expect((await storedPlan(app)).records.home[0].location).toBe('Basement north wall');
  await app.getByRole('button', { name: 'Edit Water main' }).click();
  await dialog.getByRole('button', { name: 'Show private details' }).click();
  await expect(dialog.getByLabel('Shutoff, key, or access location')).toHaveValue('Basement north wall');
});

test('Ctrl+K does nothing while another dialog is open', async ({ app }) => {
  await nav(app, 'People');
  await app.locator('.page-actions').getByRole('button').click();
  await app.keyboard.press('Control+k');
  await expect(app.getByRole('dialog', { name: 'Search your plan' })).toHaveCount(0);
});

test('a restore that cannot be saved leaves the current plan and says so', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Current person' });
  await fillStorage(app);
  await nav(app, 'Settings and backup');
  const [chooser] = await Promise.all([app.waitForEvent('filechooser'), app.getByRole('button', { name: 'Restore from file' }).click()]);
  await chooser.setFiles('tests/fixtures/legacy-v1-export.json');
  const dialog = app.getByRole('dialog', { name: 'Review backup before restoring' });
  await dialog.getByLabel(/I understand/).check();
  await dialog.getByRole('button', { name: 'Replace my plan' }).click();
  await expect(app.getByRole('alert')).toContainText('Nothing was replaced');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await nav(app, 'People');
  await expect(app.getByRole('heading', { name: 'Current person' })).toBeVisible();
  await expect(app.getByRole('heading', { name: 'Alex Morgan' })).toHaveCount(0);
});

test('exporting while storage is full does not also say to export a backup', async ({ app }) => {
  await fillStorage(app);
  await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Export backup' }).first().click()]);
  await skipPdf(app);
  await expect(app.locator('#live-alert')).toBeEmpty();
});
