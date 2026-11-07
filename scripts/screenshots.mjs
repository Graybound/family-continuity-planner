// Regenerate README screenshots from the built app using fictional sample data.
// Usage: npm run build && node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const url = pathToFileURL(resolve('dist/index.html')).href;
const out = (n) => resolve('docs/screenshots', n);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });

async function session(theme, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate((t) => localStorage.setItem('familyContinuityPlanner.theme', t), theme);
  if (viewport.width < 760) await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('#nav').getByRole('button', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: 'Load sample data' }).click();
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, 0));
  return { ctx, page };
}
const go = (page, name) => page.locator('#nav').getByRole('button', { name: new RegExp(`^${name}`) }).click();

{
  const { ctx, page } = await session('light', { width: 1280, height: 860 });
  await page.screenshot({ path: out('overview-light.png') });
  await go(page, 'Who handles what');
  await page.screenshot({ path: out('responsibilities-light.png') });
  await go(page, 'Get started');
  await page.getByRole('button', { name: '4. Where to start' }).click();
  await page.screenshot({ path: out('recommendations-light.png') });
  await go(page, 'Continuity review');
  await page.screenshot({ path: out('review-light.png') });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => { window.print = () => {}; });
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#topbar').getByRole('button', { name: 'Print' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Print' }).click();
  await page.waitForTimeout(200);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out('sample-packet.pdf'), format: 'Letter', preferCSSPageSize: true });
  await ctx.close();
}
{
  const { ctx, page } = await session('dark', { width: 1280, height: 860 });
  await page.screenshot({ path: out('overview-dark.png') });
  await go(page, 'Accounts');
  await page.getByRole('button', { name: 'Privacy mode' }).click();
  await page.screenshot({ path: out('privacy-mode-dark.png') });
  await ctx.close();
}
{
  const { ctx, page } = await session('light', { width: 390, height: 844 });
  await page.screenshot({ path: out('mobile-light.png') });
  await ctx.close();
}
await browser.close();
console.log('screenshots written to docs/screenshots');
