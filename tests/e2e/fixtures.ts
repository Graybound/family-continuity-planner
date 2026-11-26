import { test as base, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export const APP_URL = pathToFileURL(resolve('dist/index.html')).href;
if (!existsSync(resolve('dist/index.html'))) throw new Error('Run "npm run build" before the browser tests.');

/**
 * Every test gets a page that records any request leaving the device and any
 * console error (including Content Security Policy violations). Both must be
 * empty when the test ends.
 */
export const test = base.extend<{ app: Page; external: string[]; consoleErrors: string[] }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures require an object pattern
  external: async ({}, use) => { await use([]); },
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures require an object pattern
  consoleErrors: async ({}, use) => { await use([]); },
  app: async ({ page, external, consoleErrors }, use) => {
    page.on('request', (r) => {
      if (!/^(file|data|blob):/.test(r.url())) external.push(r.url());
    });
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    // window.print() would block a headless test; record calls instead.
    await page.addInitScript(() => {
      const w = window as unknown as { __printed: number; __printTitles: string[]; __printPacket: string[] };
      w.__printed = 0;
      w.__printTitles = [];
      w.__printPacket = [];
      // Records the page title and the packet text at the moment the print window would open.
      window.print = () => {
        w.__printed++;
        w.__printTitles.push(document.title);
        w.__printPacket.push(document.getElementById('print-packet')?.textContent ?? '');
        window.dispatchEvent(new Event('afterprint'));
      };
    });
    await page.goto(APP_URL);
    await use(page);
    expect(external, 'no network requests leave the device').toEqual([]);
    expect(consoleErrors, 'no console errors or CSP violations').toEqual([]);
  },
});

/** Close the dialog that follows every export (it offers the PDF) without printing. */
export async function skipPdf(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Skip for now' }).click();
}

export { expect };

export async function nav(page: Page, label: string) {
  await page.locator('#nav').getByRole('button', { name: new RegExp(`^${label}`) }).click();
}

export async function addRecord(page: Page, section: string, fields: Record<string, string>) {
  await nav(page, section);
  await page.locator('.page-actions').getByRole('button', { name: /^\+? ?Add/ }).click();
  const dialog = page.getByRole('dialog');
  for (const [label, value] of Object.entries(fields)) {
    const field = dialog.getByLabel(label, { exact: false }).first();
    if ((await field.evaluate((n) => n.tagName)) === 'SELECT') await field.selectOption(value);
    else await field.fill(value);
  }
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toHaveCount(0);
}

export async function storedPlan(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('familyContinuityPlanner.v2') ?? 'null'));
}
