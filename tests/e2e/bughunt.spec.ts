import { test, expect, nav, storedPlan } from './fixtures';

test('a full browser storage still shows the saved plan instead of an empty one', async ({ app }) => {
  await app.evaluate(() => {
    const plan = { schema: 'family-continuity-planner', schemaVersion: 2, info: { planName: 'Our real plan' }, records: { people: [{ id: 'p1', name: 'Alex Rivera' }] } };
    localStorage.setItem('familyContinuityPlanner.v2', JSON.stringify(plan));
    // Fill the rest of the storage quota, coarse to fine, so not even one more character fits.
    let i = 0;
    for (const size of [1_000_000, 100_000, 10_000, 1_000, 100, 10, 1]) {
      const chunk = 'x'.repeat(size);
      try { for (;;) localStorage.setItem(`filler${i++}`, chunk); } catch { /* full at this size */ }
    }
  });
  await app.reload();
  await expect(app).toHaveTitle(/Our real plan/);
  await nav(app, 'People');
  await expect(app.getByRole('heading', { name: 'Alex Rivera' })).toBeVisible();
  await expect(app.getByText('This browser is not letting the planner save anything')).toHaveCount(0);
  await app.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('filler')) localStorage.removeItem(k);
  });
});

// Known bug, fix belongs in src/ui (see the bug hunt PR): text fields have no maxlength, so a note
// longer than the 20,000 character limit saves, then is cut short the next time the plan loads.
// Remove test.fail() when the edit form enforces the same limits as normalize.ts.
test('a very long note is not silently shortened after a reload', async ({ app }) => {
  test.fail();
  await nav(app, 'Notes');
  await app.locator('.page-actions').getByRole('button').click();
  const dialog = app.getByRole('dialog');
  await dialog.getByLabel('Title').fill('Home server runbook');
  const long = 'step '.repeat(5000); // 25,000 characters
  await dialog.locator('textarea[name=details]').fill(long);
  await dialog.getByRole('button', { name: 'Save' }).click();
  const typed = (await storedPlan(app)).records.notes[0].details as string;
  await app.reload();
  await expect(app.getByText(/was shortened/)).toHaveCount(0);
  // Whatever the form accepted must survive a reload unchanged.
  await nav(app, 'Notes');
  await app.getByRole('button', { name: 'Edit Home server runbook' }).click();
  await app.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  expect(((await storedPlan(app)).records.notes[0].details as string).length).toBe(typed.length);
});
