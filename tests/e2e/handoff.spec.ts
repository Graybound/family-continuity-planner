import AxeBuilder from '@axe-core/playwright';
import { test, expect, nav, storedPlan } from './fixtures';

test('typing a password into an entry shows a gentle warning that does not block saving', async ({ app }) => {
  await nav(app, 'Accounts');
  await app.locator('.page-actions').getByRole('button', { name: /Add/ }).click();
  const dialog = app.getByRole('dialog');
  await dialog.getByLabel('Institution or service').fill('Example Bank');
  const access = dialog.getByLabel('Where access instructions are stored');
  await access.fill('In the password manager under "Bank"');
  await expect(dialog.getByText(/This looks like/)).toHaveCount(0);
  await access.fill('Password: hunter2'); // privacy-scan: allow
  const warning = dialog.getByText(/This looks like a password or PIN/);
  await expect(warning).toBeVisible();
  // The warning is announced and tied to the field it is about.
  const warnId = await warning.getAttribute('id');
  expect(await access.getAttribute('aria-describedby')).toContain(warnId);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toHaveCount(0);
  expect((await storedPlan(app)).records.accounts[0].access).toBe('Password: hunter2'); // privacy-scan: allow
});

test('Accounts explains how to hand over access and tracks practicing the handoff', async ({ app }) => {
  await nav(app, 'Accounts');
  const guide = app.locator('.handoff-guide');
  await expect(guide.getByRole('heading', { name: 'Hand over access without writing down passwords' })).toBeVisible();
  await guide.getByText(/Ways to hand over access, best first/).click();
  await expect(guide.locator('.handoff-methods li').first()).toContainText('Emergency access to your password manager');
  // A new plan already has the practice step on its checklist.
  await expect(guide.locator('[data-practice="planned"]')).toBeVisible();
  const axe = await new AxeBuilder({ page: app }).include('.handoff-guide').analyze();
  expect(axe.violations).toEqual([]);

  // A plan whose checklist does not have it (for example an older plan) offers to add it.
  await app.evaluate(() => {
    const plan = { schema: 'family-continuity-planner', schemaVersion: 2, info: { planName: 'Older plan' }, checklist: [] };
    localStorage.setItem('familyContinuityPlanner.v2', JSON.stringify(plan));
  });
  await app.reload();
  await nav(app, 'Accounts');
  await app.getByRole('button', { name: 'Add this to my checklist' }).click();
  await expect(app.locator('[data-practice="planned"]')).toBeVisible();

  // Ticking it on the checklist shows it as done in Accounts.
  await app.getByRole('button', { name: 'Open the checklist' }).click();
  await app.getByRole('checkbox', { name: /Practice the handoff once/ }).check();
  await nav(app, 'Accounts');
  await expect(app.locator('[data-practice="done"]')).toBeVisible();
});
