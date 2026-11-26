import { test, expect, addRecord, nav } from './fixtures';
import type { Page } from '@playwright/test';

/** Visible sidebar labels, in order, without counts. */
async function navLabels(page: Page): Promise<string[]> {
  return page.locator('#nav .nav-btn > span:not(.nav-count):not([aria-hidden])').allInnerTexts();
}

const NAV = [
  'Overview', 'Start Here',
  'Trusted contacts', 'Emergency plans', 'Documents', 'Who handles what', 'Accounts', 'Home and utilities', 'People', 'Health', 'Notes', 'Checklist',
  'Planning questions', 'Suggestions', 'Settings and backup',
];

test('first open: the overview offers exactly one next step', async ({ app }) => {
  const hero = app.locator('.hero');
  await expect(hero.getByRole('button')).toHaveCount(2); // the next step, and the quiet planning questions link
  await expect(hero.locator('.btn.signal')).toHaveText('Next: Name at least one trusted contact');
  await expect(hero.getByRole('button', { name: 'Export backup' })).toHaveCount(0);
  await expect(hero.getByRole('button', { name: 'Answer a few planning questions' })).toHaveClass(/link/);
  // Nothing in the plan yet, so no grid of nine "0 entries / Not started" cards.
  await expect(app.getByRole('heading', { name: 'Your plan at a glance' })).toHaveCount(0);
});

test('first open: a trusted contact is asked for once, not three times', async ({ app }) => {
  const view = app.locator('#view');
  await expect(view.getByText('No trusted contacts yet')).toHaveCount(0);
  await expect(view.locator('.req-list').first().getByText('Name at least one trusted contact')).toHaveCount(1);
  // The Suggestions page still lists it, for anyone who looks there.
  await nav(app, 'Suggestions');
  await expect(app.getByRole('heading', { name: 'No trusted contacts yet' })).toBeVisible();
});

test('first open: no jargon, and "This is not a will" is not on the overview', async ({ app }) => {
  const text = await app.locator('#view').innerText();
  for (const word of [/continuity assessment/i, /continuity review/i, /readiness/i, /This is not a will/]) expect(text).not.toMatch(word);
  const sidebar = await app.locator('#nav').innerText();
  expect(sidebar).not.toMatch(/Get started|Continuity review/);
});

test('sidebar order matches the order the next step walks through', async ({ app }) => {
  expect(await navLabels(app)).toEqual(NAV);
  // "Planning questions" no longer sits next to "Start Here".
  const labels = await navLabels(app);
  expect(Math.abs(labels.indexOf('Planning questions') - labels.indexOf('Start Here'))).toBeGreaterThan(1);
});

test('following "Next" from a new plan goes down the sidebar in order, then to the backup', async ({ app }) => {
  const visited: string[] = [];
  const next = () => app.locator('.hero .btn.signal');
  const steps: [string, Record<string, string>][] = [
    ['Trusted contacts', { 'Contact or organization': 'Pat Lee' }],
    ['Emergency plans', { 'Plan name': 'Power outage', 'When to use this plan': 'Power out', 'Steps, one per line': 'Check breakers' }],
    ['Documents', { Document: 'Will', 'Physical or digital location': 'Fire safe' }],
  ];
  for (const [section, fields] of steps) {
    await next().click();
    await expect(app.locator('#nav [aria-current="page"]')).toContainText(section);
    visited.push(section);
    await addRecord(app, section, fields);
    await nav(app, 'Overview');
  }
  expect(visited).toEqual(NAV.slice(2, 5));
  await expect(next()).toHaveText('Next: Export a backup');
  await next().click();
  await expect(app.locator('#nav [aria-current="page"]')).toContainText('Settings and backup');
  await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Export backup' }).last().click()]);
  await nav(app, 'Overview');
  await expect(app.getByRole('heading', { name: 'Ready for an emergency', level: 2 })).toBeVisible();
  // The next level starts with the next page in the sidebar.
  await expect(next()).toHaveText(/^Next: Describe at least three things you handle/);
  await expect(app.getByRole('heading', { name: 'Your plan at a glance' })).toBeVisible();
});

test('planning questions: plain names, an example for each area, and a clear way out', async ({ app }) => {
  await app.getByRole('button', { name: 'Answer a few planning questions' }).click();
  await expect(app.getByRole('heading', { name: 'Where should you start?', level: 1 })).toBeVisible();
  const steps = app.getByRole('navigation', { name: 'Question steps' });
  await expect(steps).not.toContainText('Who handles what'); // that is a section page, not a question step
  await steps.getByRole('button', { name: /Who does what today/ }).click();
  await expect(app.getByLabel('Technology and devices')).toHaveAccessibleDescription(/Wi-Fi/);
  await app.getByRole('button', { name: 'Next', exact: true }).click();
  await app.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(app.getByRole('button', { name: 'Open Trusted contacts' })).toBeVisible();
  await app.getByRole('button', { name: 'Finish and see my next step' }).click();
  await expect(app.getByRole('heading', { name: 'Start with the information only you know.' })).toBeVisible();
  await expect(app.getByRole('button', { name: 'Answer a few planning questions' })).toHaveCount(0);
});
