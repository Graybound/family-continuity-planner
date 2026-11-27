// The saved plan file: Export backup downloads the whole app with the plan inside.
// The file must open from disk and show the same plan in every engine CI runs,
// whichever engine made it. See docs/specs/self-contained-plan-file.md.
import { readFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, nav, addRecord, storedPlan, skipPdf } from './fixtures';

const HOSTILE = 'Call </script><script>window.PWNED=1</script><!-- & é 😀';
const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
// Open the file in the same engines this run covers (PW_BROWSERS, as in playwright.config.ts).
const requested = (process.env.PW_BROWSERS || 'chromium').split(',').map((b) => b.trim().toLowerCase());
const openIn = requested.includes('all') ? Object.keys(ENGINES) : Object.keys(ENGINES).filter((b) => requested.includes(b));

async function exportSavedFile(page: Page): Promise<{ path: string; name: string }> {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).first().click()]);
  await skipPdf(page);
  // A stable path with the real file name, so the page sees the same name a person would.
  const path = join(mkdtempSync(join(tmpdir(), 'wig-')), dl.suggestedFilename());
  copyFileSync((await dl.path())!, path);
  return { path, name: dl.suggestedFilename() };
}

/** Open a saved file in a fresh profile, recording errors and any request leaving the device. */
async function openSaved(browser: Browser, path: string) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  const external: string[] = [];
  // Firefox's own favicon loader reports the CSP block on /favicon.ico; that is browser code, not the page.
  const firefoxFavicon = (t: string) => t.includes('FaviconLoader') && t.includes('/favicon.ico');
  page.on('console', (m) => m.type() === 'error' && !firefoxFavicon(m.text()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    if (!/^(file|data|blob):/.test(r.url())) external.push(r.url());
  });
  await page.goto(pathToFileURL(path).href);
  return { ctx, page, errors, external };
}

test('Export backup saves the app with the plan inside, named by local date and time', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Alex Morgan', Notes: HOSTILE });
  const { path, name } = await exportSavedFile(app);
  expect(name).toMatch(/^WhenImGone_\d{4}-\d{2}-\d{2}_\d{4}_\d{2}\.html$/);
  const html = readFileSync(path, 'utf8');
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toContain('http-equiv="Content-Security-Policy"');
  expect(html.match(/id="when-im-gone-plan"/g)).toHaveLength(1);
  // Nothing the creator typed can end the plan block early.
  const block = html.slice(html.indexOf('id="when-im-gone-plan"'));
  expect(block.slice(0, block.indexOf('</script>'))).not.toContain('<');
  // The page copy is the app as built, not this session's screen.
  expect(html).toContain('<div id="view"></div>');
  expect(html.match(/id="static-plan"/g)).toHaveLength(1);
  expect(html).not.toMatch(/<html[^>]*\bjs\b/);
});

test('with Your name filled in, saved file names start with it', async ({ app }) => {
  await nav(app, 'Settings');
  await app.getByLabel('Your name').fill('Zoë Morgan-Lee');
  await app.getByRole('button', { name: 'Save details' }).click();
  const { name } = await exportSavedFile(app);
  expect(name).toMatch(/^WhenImGone_Zoë_Morgan_Lee_\d{4}-\d{2}-\d{2}_\d{4}_\d{2}\.html$/);
});

test('a saved file opens from disk with the same plan in every engine', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Alex Morgan', Notes: HOSTILE });
  const { path } = await exportSavedFile(app);
  for (const engine of openIn) {
    // Same Chromium override as playwright.config.ts.
    const browser = await ENGINES[engine]!.launch(engine === 'chromium' && process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
    try {
      const { ctx, page, errors, external } = await openSaved(browser, path);
      await nav(page, 'People');
      await expect(page.getByRole('heading', { name: 'Alex Morgan' }), engine).toBeVisible();
      await expect(page.getByText(HOSTILE), engine).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { PWNED?: number }).PWNED), engine).toBeUndefined();
      // It is a working app: a change is kept in this browser as the file's draft.
      await addRecord(page, 'People', { 'Full name': `Added in ${engine}` });
      const draft = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          if (k.startsWith('familyContinuityPlanner.draft.')) return JSON.parse(localStorage.getItem(k)!);
        }
        return null;
      });
      expect(draft.records.people.map((p: { name: string }) => p.name), engine).toEqual(['Alex Morgan', `Added in ${engine}`]);
      expect(errors, `${engine}: no console errors or CSP violations`).toEqual([]);
      expect(external, `${engine}: no network requests`).toEqual([]);
      await ctx.close();
    } finally {
      await browser.close();
    }
  }
});

async function nameThePlan(page: Page, owner: string) {
  await nav(page, 'Settings');
  await page.getByLabel('Plan name').fill('The Morgan Household');
  await page.getByLabel('Your name').fill(owner);
  await page.getByRole('button', { name: 'Save details' }).click();
}

test('with scripts off, a saved file shows the whole plan to read and how to open it', async ({ app }) => {
  await nameThePlan(app, 'Alex Morgan');
  await addRecord(app, 'Trusted contacts', { 'Contact or organization': 'Pat Lee', Phone: '555-0140', Email: 'pat@example.com', 'When to contact': HOSTILE });
  const { path } = await exportSavedFile(app);
  for (const engine of openIn) {
    const browser = await ENGINES[engine]!.launch(engine === 'chromium' && process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
    try {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && !(m.text().includes('FaviconLoader') && m.text().includes('/favicon.ico')) && errors.push(m.text()));
      await page.goto(pathToFileURL(path).href);
      const copy = page.locator('#static-plan');
      await expect(copy.getByRole('heading', { level: 1, name: 'This is The Morgan Household.' }), engine).toBeVisible();
      await expect(copy, engine).toContainText(/Alex Morgan's plan, saved \w+day, \w+ \d{1,2}, \d{4} at \d{1,2}:\d{2}/);
      await expect(copy, engine).toContainText('the one with the latest date in its name is the newest');
      await expect(copy.getByText('On an iPhone or iPad:'), engine).toBeVisible();
      await expect(copy.getByRole('heading', { name: 'Start here' }), engine).toBeVisible();
      await expect(copy.getByRole('link', { name: '555-0140' }), engine).toHaveAttribute('href', 'tel:5550140');
      await expect(copy.getByRole('link', { name: 'pat@example.com' }), engine).toHaveAttribute('href', 'mailto:pat@example.com');
      await expect(copy.getByText(HOSTILE), engine).toBeVisible();
      // The empty app shell and the "needs JavaScript" line stay out of the way.
      await expect(page.locator('#app'), engine).toBeHidden();
      await expect(page.getByText('needs JavaScript turned on'), engine).toBeHidden();
      expect(await page.title(), engine).toMatch(/^Alex Morgan's plan, saved /);
      expect(errors, `${engine}: no console errors or CSP violations`).toEqual([]);
      await ctx.close();
    } finally {
      await browser.close();
    }
  }
});

test('the readable copy passes axe in both themes', async ({ app, browser }) => {
  await nameThePlan(app, 'Alex Morgan');
  await addRecord(app, 'Trusted contacts', { 'Contact or organization': 'Pat Lee', Phone: '555-0140' });
  const { path } = await exportSavedFile(app);
  // axe needs scripts, so show the page as a script-less preview would: the same file with its own scripts taken out.
  const html = readFileSync(path, 'utf8').replace(/<script(?![^>]*application\/json)[^>]*>[\s\S]*?<\/script>/g, '');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const theme of ['dark', 'light']) {
    await page.setContent(html.replace('data-theme="dark"', `data-theme="${theme}"`));
    await expect(page.locator('#static-plan')).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), theme).toEqual([]);
  }
  await ctx.close();
});

test('with scripts on, the readable copy is gone and a banner says whose plan and when', async ({ app, browser }) => {
  await nameThePlan(app, 'Alex Morgan');
  const { path } = await exportSavedFile(app);
  const { ctx, page, errors } = await openSaved(browser, path);
  await expect(page.locator('#banners')).toContainText(/Alex Morgan's plan, saved \w+day, .* the latest date in its name is the newest\./);
  await expect(page.locator('#static-plan')).toHaveCount(0);
  await expect(page.locator('#view')).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('a copy saved from a saved file has one plan block and the newest plan', async ({ app, browser }) => {
  await addRecord(app, 'People', { 'Full name': 'First' });
  const first = await exportSavedFile(app);
  const { ctx, page, errors } = await openSaved(browser, first.path);
  await addRecord(page, 'People', { 'Full name': 'Second' });
  const second = await exportSavedFile(page);
  const html = readFileSync(second.path, 'utf8');
  expect(html.match(/id="when-im-gone-plan"/g)).toHaveLength(1);
  expect(html.match(/id="static-plan"/g)).toHaveLength(1);
  expect(html).toContain('Second</h3>');
  const reopened = await openSaved(browser, second.path);
  await nav(reopened.page, 'People');
  await expect(reopened.page.getByRole('heading', { name: 'Second' })).toBeVisible();
  expect([...errors, ...reopened.errors]).toEqual([]);
  await reopened.ctx.close();
  await ctx.close();
});

test('Restore accepts a saved file and gives the same plan as the JSON backup', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Alex Morgan', Notes: HOSTILE });
  const { path } = await exportSavedFile(app);
  await nav(app, 'Settings and backup');
  const [jdl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Export .json' }).click()]);
  await skipPdf(app);
  const fromJson = JSON.parse(readFileSync((await jdl.path())!, 'utf8'));
  await addRecord(app, 'People', { 'Full name': 'Added later' });
  await nav(app, 'Settings and backup');
  const [chooser] = await Promise.all([app.waitForEvent('filechooser'), app.getByRole('button', { name: 'Restore from file' }).click()]);
  await chooser.setFiles(path);
  const dialog = app.getByRole('dialog', { name: 'Review backup before restoring' });
  await dialog.getByLabel(/I understand this replaces/).check();
  await dialog.getByRole('button', { name: 'Replace my plan' }).click();
  const restored = await storedPlan(app);
  expect(restored.records).toEqual(fromJson.records);
  expect(restored.messages).toEqual(fromJson.messages);
});

test('Restore explains an HTML file that has no plan in it', async ({ app }) => {
  await nav(app, 'Settings and backup');
  const [chooser] = await Promise.all([app.waitForEvent('filechooser'), app.getByRole('button', { name: 'Restore from file' }).click()]);
  await chooser.setFiles('dist/index.html');
  await expect(app.locator('#live-alert')).toContainText('does not contain a saved plan');
  expect(await storedPlan(app)).toBeNull();
});

test('a saved file always opens on its own plan, even when this browser holds another plan', async ({ app, browser }) => {
  await addRecord(app, 'People', { 'Full name': 'In the file' });
  const { path } = await exportSavedFile(app);
  const { ctx, page, errors } = await openSaved(browser, path);
  // Another plan in this browser's main slot, and nothing about the file's draft.
  await page.evaluate(() => {
    const p = JSON.parse('{}');
    localStorage.setItem('familyContinuityPlanner.v2', JSON.stringify(Object.assign(p, { schema: 'family-continuity-planner', schemaVersion: 2, info: { planName: 'Other' }, records: { people: [{ id: 'o1', name: 'Someone else' }] }, checklist: [] })));
  });
  const other = await page.evaluate(() => localStorage.getItem('familyContinuityPlanner.v2'));
  await page.reload();
  await nav(page, 'People');
  await expect(page.getByRole('heading', { name: 'In the file' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Someone else' })).toHaveCount(0);
  // Editing in the file never touches the other plan.
  await addRecord(page, 'People', { 'Full name': 'Edited in the file' });
  expect(await page.evaluate(() => localStorage.getItem('familyContinuityPlanner.v2'))).toBe(other);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('unsaved changes in a saved file are offered back, never applied by themselves', async ({ app, browser }) => {
  await addRecord(app, 'People', { 'Full name': 'In the file' });
  const { path } = await exportSavedFile(app);
  const { ctx, page, errors } = await openSaved(browser, path);
  await addRecord(page, 'People', { 'Full name': 'Not saved to a file' });
  await page.reload();
  // The file's own plan shows first.
  await nav(page, 'People');
  await expect(page.getByRole('heading', { name: 'Not saved to a file' })).toHaveCount(0);
  const banner = page.locator('.banner').filter({ hasText: 'You have unsaved changes' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Restore my unsaved changes' }).click();
  await nav(page, 'People');
  await expect(page.getByRole('heading', { name: 'Not saved to a file' })).toBeVisible();
  // Discarding instead leaves the file's plan and forgets the draft.
  await page.reload();
  await page.locator('.banner').filter({ hasText: 'You have unsaved changes' }).getByRole('button', { name: 'Discard them' }).click();
  await page.reload();
  await expect(page.locator('.banner').filter({ hasText: 'You have unsaved changes' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('after saving to a new file, the older file says where the changes went', async ({ app, browser }) => {
  await addRecord(app, 'People', { 'Full name': 'In the file' });
  const { path } = await exportSavedFile(app);
  const { ctx, page, errors } = await openSaved(browser, path);
  await addRecord(page, 'People', { 'Full name': 'Saved to a newer file' });
  const newer = await exportSavedFile(page);
  await page.reload();
  const banner = page.locator('.banner').filter({ hasText: 'were saved to a newer file' });
  await expect(banner).toContainText(newer.name);
  await expect(page.locator('.banner').filter({ hasText: 'You have unsaved changes' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('two saved files never share unsaved changes', async ({ app, browser }) => {
  await addRecord(app, 'People', { 'Full name': 'Plan A' });
  const a = await exportSavedFile(app);
  const copy = join(mkdtempSync(join(tmpdir(), 'wig-')), 'WhenImGone_2026-01-01_0000.html');
  copyFileSync(a.path, copy);
  const { ctx, page, errors } = await openSaved(browser, a.path);
  await addRecord(page, 'People', { 'Full name': 'Edited in A' });
  await page.goto(pathToFileURL(copy).href);
  await nav(page, 'People');
  await expect(page.getByRole('heading', { name: 'Edited in A' })).toHaveCount(0);
  await expect(page.locator('.banner').filter({ hasText: 'You have unsaved changes' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('every export offers a PDF named like the file, with private details and the save time', async ({ app }) => {
  await nameThePlan(app, 'Alex Morgan');
  await addRecord(app, 'People', { 'Full name': 'Jordan Morgan', Address: '12 Example Lane' });
  for (const button of ['Export backup', 'Export .json']) {
    await nav(app, 'Settings');
    const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: button, exact: true }).last().click()]);
    const stem = dl.suggestedFilename().replace(/\.(html|json)$/, '');
    const dialog = app.getByRole('dialog', { name: `Saved ${dl.suggestedFilename()}` });
    await expect(dialog.getByRole('heading', { name: 'Step 2 of 2: save a PDF too' })).toBeVisible();
    await expect(dialog.getByLabel('Include private details')).toBeChecked();
    const titleBefore = await app.title();
    await dialog.getByRole('button', { name: 'Save the PDF' }).click();
    await expect.poll(() => app.evaluate(() => (window as unknown as { __printTitles: string[] }).__printTitles.at(-1))).toBe(stem);
    const packet = await app.evaluate(() => (window as unknown as { __printPacket: string[] }).__printPacket.at(-1)!);
    expect(packet, button).toMatch(/Alex Morgan's plan, saved \w+day, .* the latest date in its name is the newest\./);
    expect(packet, button).toContain('12 Example Lane');
    await expect.poll(() => app.title()).toBe(titleBefore);
  }
});

test('the "opened on their device" step records the date, travels with the plan, and stops asking', async ({ app }) => {
  await addRecord(app, 'People', { 'Full name': 'Jordan Morgan' });
  await nav(app, 'Suggestions');
  await expect(app.getByText('Nobody has opened a saved copy on your family\'s device yet')).toHaveCount(0);
  await app.getByRole('button', { name: 'Export backup' }).first().click();
  const dialog = app.getByRole('dialog');
  await expect(dialog).toContainText('Send this to the phone or computer your family uses, and open it there once.');
  await skipPdf(app);
  await nav(app, 'Suggestions');
  await expect(app.getByText('Nobody has opened a saved copy on your family\'s device yet')).toBeVisible();
  await nav(app, 'Settings');
  await app.getByLabel('It opened on their device').check();
  expect((await storedPlan(app)).info.familyOpenedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(app.getByText(/Last confirmed/)).toBeVisible();
  await nav(app, 'Suggestions');
  await expect(app.getByText('Nobody has opened a saved copy on your family\'s device yet')).toHaveCount(0);
  await app.getByRole('button', { name: 'Export backup' }).first().click();
  await expect(app.getByRole('dialog')).not.toContainText('open it there once');
  await skipPdf(app);
});
