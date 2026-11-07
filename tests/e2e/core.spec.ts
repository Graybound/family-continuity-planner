import { readFileSync } from 'node:fs';
import { test, expect, nav, addRecord, storedPlan, APP_URL } from './fixtures';

test('works offline with no network access', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.setOffline(true);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(APP_URL);
  await expect(page.locator('.view-title')).toBeVisible();
  await addRecord(page, 'People', { 'Full name': 'Offline Person' });
  await page.reload();
  await nav(page, 'People');
  await expect(page.getByRole('heading', { name: 'Offline Person' })).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('empty plan shows Getting Started with clear next steps', async ({ app }) => {
  await expect(app.getByRole('heading', { name: 'Getting Started', level: 2 })).toBeVisible();
  await expect(app.getByRole('heading', { name: 'To reach Basic Emergency Plan Ready' })).toBeVisible();
  await expect(app.locator('.req-list').first().getByText('Name at least one trusted contact')).toBeVisible();
  await expect(app.getByText('%')).toHaveCount(0);
});

test('create, edit, and delete a record, persisting across reloads', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Jordan Morgan', 'Relationship or role': 'Partner', 'Important notes': 'Line one\nLine two' });
  await expect(app.getByRole('heading', { name: 'Jordan Morgan' })).toBeVisible();
  await expect(app.locator('dd').filter({ hasText: 'Line one' })).toHaveText('Line one\nLine two');
  await app.reload();
  await nav(app, 'People');
  await app.getByRole('button', { name: 'Edit Jordan Morgan' }).click();
  await app.getByRole('dialog').getByLabel('Relationship or role').fill('Spouse');
  await app.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(app.getByText('Spouse')).toBeVisible();
  expect((await storedPlan(app)).records.people[0].relationship).toBe('Spouse');
  await app.getByRole('button', { name: 'Edit Jordan Morgan' }).click();
  await app.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  // A confirmation dialog appears on top; cancelling keeps the record.
  await app.getByRole('dialog', { name: 'Delete person?' }).getByRole('button', { name: 'Cancel' }).click();
  await app.getByRole('dialog', { name: 'Edit person' }).getByRole('button', { name: 'Delete' }).click();
  await app.getByRole('dialog', { name: 'Delete person?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(app.getByRole('heading', { name: 'Jordan Morgan' })).toHaveCount(0);
  expect((await storedPlan(app)).records.people).toHaveLength(0);
});

test('required fields are enforced with native validation', async ({ app }) => {
  await nav(app, 'Documents');
  await app.locator('.page-actions').getByRole('button').click();
  const dialog = app.getByRole('dialog');
  await dialog.getByLabel('Document').first().fill('Passport');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeVisible();
  expect(await dialog.getByLabel('Physical or digital location').evaluate((n: HTMLInputElement) => n.validity.valueMissing)).toBe(true);
});

test('checklist: toggle keeps focus, add, edit, and delete', async ({ app }) => {
  await nav(app, 'Checklist');
  const box = app.getByRole('checkbox', { name: 'Choose two trusted backup contacts' });
  await box.focus();
  await app.keyboard.press('Space');
  await expect(box).toBeChecked();
  await expect(box).toBeFocused();
  expect((await storedPlan(app)).checklist[0].done).toBe(true);

  await app.locator('.page-actions').getByRole('button', { name: /Add item/ }).click();
  await app.getByRole('dialog').getByLabel('Task').fill('Show Pat where the backup is');
  await app.getByRole('dialog').getByLabel('Group').selectOption('People to brief');
  await app.getByRole('dialog').getByRole('button', { name: 'Add item' }).click();
  await expect(app.getByRole('checkbox', { name: 'Show Pat where the backup is' })).toBeVisible();

  await app.getByRole('button', { name: 'Edit Show Pat where the backup is' }).click();
  await app.getByRole('dialog').getByLabel('Task').fill('Show Pat the backup');
  await app.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(app.getByRole('checkbox', { name: 'Show Pat the backup' })).toBeVisible();

  await app.getByRole('button', { name: 'Delete Show Pat the backup' }).click();
  await app.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(app.getByRole('checkbox', { name: 'Show Pat the backup' })).toHaveCount(0);
});

test('search with Ctrl+K opens the matching record', async ({ app }) => {
  await addRecord(app, 'Trusted contacts', { 'Contact or organization': 'Example HVAC Services', Role: 'Furnace repair' });
  await nav(app, 'Overview');
  await app.keyboard.press('Control+k');
  const search = app.getByRole('dialog', { name: 'Search your plan' });
  await expect(search.getByLabel('Search text')).toBeFocused();
  await app.keyboard.type('furnace');
  await expect(search.getByText('1 result')).toBeVisible();
  await app.keyboard.press('ArrowDown');
  await app.keyboard.press('Enter');
  await expect(app.getByRole('dialog', { name: 'Edit contact' })).toBeVisible();
  await expect(app.locator('.view-title')).toHaveText('Trusted contacts');
});

test('theme choice persists after reload', async ({ app }) => {
  const before = await app.evaluate(() => document.documentElement.dataset.theme);
  await app.locator('#topbar').getByRole('button', { name: /mode$/ }).first().click();
  const after = await app.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await app.reload();
  expect(await app.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
});

test('privacy mode removes private text from the page and from search', async ({ app }) => {
  await addRecord(app, 'Home and utilities', { 'Utility, property, or service': 'Water main', 'Shutoff, key, or access location': 'Basement north wall' });
  await expect(app.getByText('Basement north wall')).toBeVisible();
  await app.getByRole('button', { name: 'Privacy mode' }).click();
  await expect(app.getByRole('button', { name: 'Privacy mode' })).toHaveAttribute('aria-pressed', 'true');
  expect(await app.locator('body').innerText()).not.toContain('Basement north wall');
  await expect(app.getByText('Hidden while privacy mode is on')).toBeVisible();
  await app.keyboard.press('Control+k');
  await app.keyboard.type('basement');
  await expect(app.getByRole('dialog').getByText('0 results')).toBeVisible();
});

test('a legacy v1 plan in browser storage is upgraded on first load and the original is kept', async ({ app }) => {
  const legacy = readFileSync('tests/fixtures/legacy-v1-export.json', 'utf8');
  await app.evaluate((t) => { localStorage.clear(); localStorage.setItem('familyContinuityPlanner.v1', t); }, legacy);
  await app.reload();
  await expect(app.getByText('Your plan from the original version of this app was upgraded')).toBeVisible();
  await nav(app, 'People');
  await expect(app.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await addRecord(app, 'Notes', { Title: 'New note', Note: 'Hello' });
  expect(await app.evaluate(() => localStorage.getItem('familyContinuityPlanner.v1'))).toBe(legacy);
  expect((await storedPlan(app)).schemaVersion).toBe(2);
});

test('damaged saved data is kept and can be downloaded instead of being overwritten', async ({ app }) => {
  const raw = '{"schema":"family-continuity-planner","schemaVersion":2,"records":{"people":[{"name":"Precious"}]} TRUNCATED';
  await app.evaluate((t) => { localStorage.clear(); localStorage.setItem('familyContinuityPlanner.v2', t); }, raw);
  await app.reload();
  await expect(app.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible();
  await addRecord(app, 'People', { 'Full name': 'After damage' });
  const kept = await app.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('familyContinuityPlanner.recovery.')).map((k) => localStorage.getItem(k)));
  expect(kept).toEqual([raw]);
  const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Download damaged data' }).click()]);
  expect(readFileSync(await dl.path(), 'utf8')).toBe(raw);
});

test('readiness rises to Basic after a contact, plan, document, and backup', async ({ app }) => {
  await addRecord(app, 'Trusted contacts', { 'Contact or organization': 'Pat Lee' });
  await addRecord(app, 'Emergency plans', { 'Plan name': 'Power outage', 'When to use this plan': 'Power out', 'Steps, one per line': 'Check breakers' });
  await addRecord(app, 'Documents', { Document: 'Will', 'Physical or digital location': 'Fire safe' });
  await nav(app, 'Overview');
  await expect(app.getByRole('heading', { name: 'Getting Started', level: 2 })).toBeVisible();
  await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Export backup' }).first().click()]);
  await expect(app.getByRole('heading', { name: 'Basic Emergency Plan Ready', level: 2 })).toBeVisible();
});

test('assessment answers produce recommendations and an explained review suggestion', async ({ app }) => {
  await nav(app, 'Get started');
  await app.getByRole('button', { name: 'Next' }).click();
  await app.getByLabel('Taxes').selectOption('mostly-me');
  await expect(app.getByText('These depend mostly on you')).toBeVisible();
  await app.getByRole('button', { name: 'Next' }).click();
  await app.getByLabel('Pet care').check();
  await app.getByRole('button', { name: 'Next' }).click();
  await expect(app.getByRole('heading', { name: 'Priority' })).toBeVisible();
  await expect(app.getByText(/You mostly handle taxes/).first()).toBeVisible();
  await app.getByRole('button', { name: 'Finish assessment' }).click();
  await nav(app, 'Continuity review');
  const finding = app.locator('.finding').filter({ hasText: 'Taxes: how it works is not written down yet' });
  await expect(finding.getByText(/mostly handled by you/)).toBeVisible();
  await finding.getByRole('button', { name: /Go there/ }).click();
  await expect(app.getByRole('dialog').getByLabel('Area')).toHaveValue('Taxes');
  await app.getByRole('dialog').getByLabel('Responsibility').fill('Filing taxes');
  await app.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await nav(app, 'Continuity review');
  await expect(app.getByText('Taxes: how it works is not written down yet')).toHaveCount(0);
  const pets = app.locator('.finding').filter({ hasText: 'Pets' });
  await pets.getByRole('button', { name: /Remind me in 30 days/ }).click();
  await expect(app.getByText(/dismissed or snoozed/)).toBeVisible();
});

test('section status can be set to Does not apply', async ({ app }) => {
  await nav(app, 'Health');
  await app.getByLabel('Section status').selectOption('not-applicable');
  await expect(app.getByText('You marked this section as not applying')).toBeVisible();
  expect((await storedPlan(app)).modules.health).toBe('not-applicable');
});

test('start here: default text, custom text, and personal messages', async ({ app }) => {
  await nav(app, 'Start Here');
  await expect(app.getByText('You do not need to handle everything at once.')).toBeVisible();
  await app.getByLabel('Write or edit my own introduction').check();
  await app.getByLabel('Your introduction').fill('Dear family,\n\nCall Pat first.');
  await app.getByRole('button', { name: 'Save introduction' }).click();
  await expect(app.locator('.start-text').getByText('Call Pat first.')).toBeVisible();
  await app.getByRole('button', { name: 'Add a message' }).click();
  await app.getByRole('dialog').getByLabel('Who is it for?').fill('Everyone');
  await app.getByRole('dialog').getByLabel('Message').fill('Thank you.');
  await app.getByRole('dialog').getByRole('button', { name: 'Save message' }).click();
  await expect(app.getByText('For: Everyone')).toBeVisible();
});

test('sample data: load, identify, remove; erase everything', async ({ app }) => {
  await nav(app, 'Settings and backup');
  await app.getByRole('button', { name: 'Load sample data' }).click();
  await expect(app.getByText('You are looking at fictional sample data')).toBeVisible();
  await nav(app, 'Who handles what');
  await expect(app.getByRole('heading', { name: 'Paying the monthly bills' })).toBeVisible();
  await app.getByRole('button', { name: 'Remove sample data' }).first().click();
  await app.getByRole('dialog').getByRole('button', { name: 'Remove sample data' }).click();
  await expect(app.getByText('You are looking at fictional sample data')).toHaveCount(0);

  await addRecord(app, 'People', { 'Full name': 'Real person' });
  await nav(app, 'Settings and backup');
  // Loading sample over a real plan requires explicit acknowledgement.
  await app.getByRole('button', { name: 'Load sample data' }).click();
  const confirm = app.getByRole('dialog');
  await expect(confirm.getByRole('button', { name: 'Replace with sample' })).toBeDisabled();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toHaveCount(0);
  expect((await storedPlan(app)).records.people[0].name).toBe('Real person');

  await app.getByRole('button', { name: 'Erase all plan data in this browser' }).click();
  await app.getByRole('dialog').getByLabel(/cannot be undone/).check();
  await app.getByRole('dialog').getByRole('button', { name: 'Erase everything' }).click();
  await expect.poll(async () => (await storedPlan(app)).records.people.length).toBe(0);
  await expect(app.getByText('All plan data was erased from this browser.')).toBeVisible();
});

test('the "not a will" notice appears on the overview, in Get started, in Documents, and in print', async ({ app }) => {
  const notice = app.getByRole('complementary', { name: 'This is not a will' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('we recommend having both');
  await nav(app, 'Get started');
  await expect(app.getByText(/This is not a will\./)).toBeVisible();
  await nav(app, 'Documents');
  await expect(app.locator('.callout').filter({ hasText: 'Start with your will' })).toContainText('we recommend getting one');
  await app.getByRole('button', { name: 'Print' }).first().click();
  await app.getByRole('dialog').getByRole('button', { name: 'Print' }).click();
  await expect.poll(() => app.locator('#print-packet').evaluate((n) => n.textContent ?? '')).toContain('This is not a will.');
});
