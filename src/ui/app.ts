/**
 * App shell: navigation, top bar, banners, and routing between views.
 * The whole view is rebuilt on each change; focus is preserved through
 * data-focus-key (see dom.ts), and moved to the new heading after navigation.
 */
import { activeFindings } from '../core/audit';
import { SECTIONS, SECTION_IDS } from '../core/sections';
import { KEYS } from '../core/storage';
import { captureFocus, clear, h, icon, restoreFocus } from './dom';
import { parseBackup } from '../core/backup';
import { downloadRecoveryCopies, exportBackup, removeSampleData, startSavedFile } from './backupFlow';
import { embeddedBackupText } from './selfCopy';
import { STATIC_ID } from '../core/embedded';
import { openPrintDialog } from './printDialog';
import { heldPrintTitle } from './print';
import { openSearch } from './searchDialog';
import { addBanner, getPlan, getPlanKey, go, init, removeBanner, render, ui, type View } from './store';
import { applyTheme, currentTheme } from './theme';
import { toast } from './toast';
import { checklistView } from './views/checklist';
import { dashboardView } from './views/dashboard';
import { getStartedView } from './views/getStarted';
import { reviewView } from './views/review';
import { sectionView } from './views/section';
import { settingsView } from './views/settings';
import { startHereView } from './views/startHere';

type NavItem = { view: View; label: string; glyph: string; count?: () => number | null; countLabel?: string };

function navItems(): (NavItem | 'sep')[] {
  const plan = getPlan();
  return [
    { view: { name: 'dashboard' }, label: 'Overview', glyph: '◎' },
    { view: { name: 'start-here' }, label: 'Start Here', glyph: '✉' },
    'sep',
    // Sections in the order the overview suggests them (SECTION_IDS is the writing order).
    ...SECTION_IDS.map((s): NavItem => ({ view: { name: 'section', section: s }, label: SECTIONS[s].title, glyph: SECTIONS[s].icon, count: () => plan.records[s].length, countLabel: 'entries' })),
    { view: { name: 'checklist' }, label: 'Checklist', glyph: '✓', count: () => plan.checklist.filter((c) => !c.done).length, countLabel: 'open items' },
    'sep',
    // Tools for the person writing the plan. "Planning questions" is not next to "Start Here" on purpose: they sounded alike.
    { view: { name: 'get-started', step: 0 }, label: 'Planning questions', glyph: '?' },
    { view: { name: 'review' }, label: 'Suggestions', glyph: '⚑', count: () => activeFindings(plan).active.length, countLabel: 'suggestions' },
    { view: { name: 'settings' }, label: 'Settings and backup', glyph: '⚙' },
  ];
}

function sameView(a: View, b: View): boolean {
  return a.name === b.name && (a.name !== 'section' || (b.name === 'section' && a.section === b.section));
}

const mobileQuery = window.matchMedia('(max-width: 760px)');

function setMenu(open: boolean, returnFocus = true): void {
  const sidebar = document.getElementById('sidebar')!;
  const overlay = document.getElementById('mobile-overlay')!;
  const btn = document.getElementById('menu-btn');
  sidebar.classList.toggle('open', open);
  overlay.classList.toggle('show', open);
  btn?.setAttribute('aria-expanded', String(open));
  // A closed off-canvas menu must not be reachable by keyboard (v1 left it focusable).
  sidebar.inert = mobileQuery.matches && !open;
  if (open) sidebar.querySelector<HTMLElement>('[aria-current="page"], button')?.focus();
  else if (returnFocus && mobileQuery.matches) btn?.focus();
}

function renderNav(): void {
  const nav = document.getElementById('nav')!;
  clear(nav);
  for (const item of navItems()) {
    if (item === 'sep') {
      nav.append(h('li', { class: 'nav-sep', attrs: { 'aria-hidden': 'true' } }));
      continue;
    }
    const n = item.count?.() ?? null;
    const current = sameView(ui.view, item.view);
    nav.append(h('li', null, h('button', {
      class: 'nav-btn',
      attrs: { type: 'button', 'aria-current': current ? 'page' : undefined, 'data-focus-key': `nav:${item.label}` },
      on: { click: () => { setMenu(false, false); go(item.view); } },
    }, icon(item.glyph), h('span', null, item.label), n ? h('span', { class: 'nav-count' }, String(n), h('span', { class: 'sr-only' }, ` ${item.countLabel}`)) : null)));
  }
}

function renderTopbar(): void {
  const bar = document.getElementById('topbar')!;
  clear(bar);
  const dark = currentTheme() === 'dark';
  // Visible text stays a word, never a bare symbol: full label on wide screens, a short one on narrow screens.
  // The accessible name is always the full label, which contains the short one.
  const btn = (label: string, short: string, glyph: string, onClick: () => void, extra: Record<string, string> = {}, cls = '') =>
    h('button', { class: ['btn top-btn', cls], attrs: { type: 'button', 'aria-label': label, 'data-focus-key': `top:${label}`, ...extra }, on: { click: onClick } },
      icon(glyph), h('span', { class: 'label-full', attrs: { 'aria-hidden': 'true' } }, label), h('span', { class: 'label-short', attrs: { 'aria-hidden': 'true' } }, short));
  bar.append(
    h('button', { class: 'btn mobile-menu', attrs: { id: 'menu-btn', type: 'button', 'aria-controls': 'sidebar', 'aria-expanded': 'false' }, on: { click: () => setMenu(true) } }, icon('☰'), h('span', null, 'Menu')),
    h('button', { class: 'search-btn', attrs: { type: 'button', 'data-focus-key': 'top:search', 'aria-keyshortcuts': 'Control+K Meta+K' }, on: { click: openSearch } }, icon('⌕'), h('span', { class: 'search-label' }, 'Search your plan'), h('kbd', { attrs: { 'aria-hidden': 'true' } }, 'Ctrl K')),
    h('div', { class: 'top-actions' },
      btn(dark ? 'Light mode' : 'Dark mode', dark ? 'Light' : 'Dark', dark ? '☀' : '☾', () => {
        applyTheme(dark ? 'light' : 'dark');
        toast(dark ? 'Light mode on' : 'Dark mode on');
        render();
      }, {}, 'theme-btn'),
      btn('Privacy mode', 'Privacy', '◉', () => {
        ui.privacy = !ui.privacy;
        toast(ui.privacy ? 'Privacy mode on: private details hidden' : 'Privacy mode off: private details shown');
        render();
      }, { 'aria-pressed': String(ui.privacy) }),
      btn('Export backup', 'Backup', '⇩', exportBackup),
      btn('Print', 'Print', '⎙', openPrintDialog),
    ),
  );
}

function renderBanners(): void {
  const el = document.getElementById('banners')!;
  clear(el);
  const plan = getPlan();
  const all = [...ui.banners];
  if (plan.info.isSample) {
    all.unshift({ id: 'sample', tone: 'info', text: 'You are looking at fictional sample data. Nothing here is real.', actions: [{ label: 'Remove sample data', run: removeSampleData }], dismissible: false });
  }
  // Privacy mode hides text in place. Say so on every screen, with a one-tap way back, so hidden details never look lost.
  if (ui.privacy) {
    all.unshift({ id: 'privacy', tone: 'info', text: 'Privacy mode is on, so some private details are hidden on this screen.', actions: [{ label: 'Show hidden details', run: () => {
      ui.privacy = false;
      toast('Privacy mode off: private details shown');
      render();
      // The banner and its button are gone after the render; keep keyboard focus on the page.
      document.getElementById('main-content')?.focus();
    } }], dismissible: false });
  }
  for (const b of all) {
    el.append(h('div', { class: ['banner', b.tone], attrs: { role: b.tone === 'warn' ? 'alert' : undefined } },
      h('p', null, b.text),
      b.actions.map((a) => h('button', { class: 'btn small', attrs: { type: 'button' }, on: { click: a.run } }, a.label)),
      b.dismissible ? h('button', { class: 'btn small', attrs: { type: 'button', 'aria-label': 'Dismiss this message' }, on: { click: () => removeBanner(b.id) } }, 'Dismiss') : null,
    ));
  }
}

function viewFor(v: View): HTMLElement {
  switch (v.name) {
    case 'dashboard': return dashboardView();
    case 'get-started': return getStartedView(v.step);
    case 'start-here': return startHereView();
    case 'section': return sectionView(v.section);
    case 'checklist': return checklistView();
    case 'review': return reviewView();
    case 'settings': return settingsView();
  }
}

function renderApp(): void {
  const saved = captureFocus();
  document.body.classList.toggle('privacy-on', ui.privacy);
  renderNav();
  renderTopbar();
  renderBanners();
  const view = document.getElementById('view')!;
  clear(view);
  view.append(viewFor(ui.view));
  const plan = getPlan();
  // While a PDF is being saved, the title is the file's name (see printPacket).
  document.title = heldPrintTitle() ?? `${plan.info.planName ? `${plan.info.planName} | ` : ''}Family Continuity Planner`;
  if (ui.focusHeading) {
    ui.focusHeading = false;
    view.querySelector<HTMLElement>('.view-title')?.focus();
  } else {
    restoreFocus(saved);
  }
}

export function start(): void {
  // The readable copy is for previews that run no scripts; the stylesheet already hides it here.
  document.getElementById(STATIC_ID)?.remove();
  // A saved plan file (the app with a plan inside) always opens on its own plan.
  const embedded = embeddedBackupText();
  const opened = embedded === null ? null : parseBackup(embedded);
  if (opened?.ok) startSavedFile(renderApp, opened);
  else startFromStorage(opened && !opened.ok ? opened.error : null);
  startCommon();
}

function startFromStorage(fileError: string | null): void {
  const result = init(renderApp);
  if (fileError) {
    addBanner({ id: 'file-damaged', tone: 'warn', text: `This file is meant to contain a saved plan, but it could not be read (${fileError}) Showing the plan saved in this browser instead. If you have another copy of the file, try that one.`, actions: [], dismissible: true });
  }
  if (result.status === 'migrated-legacy') {
    addBanner({ id: 'migrated', tone: 'info', text: 'Your plan from the original version of this app was upgraded. Nothing was deleted: the original saved copy is still in this browser. Exporting a fresh backup now is a good idea.', actions: [{ label: 'Export backup', run: exportBackup }], dismissible: true });
  } else if (result.status === 'damaged') {
    addBanner({
      id: 'damaged', tone: 'warn',
      text: result.recoveryKey
        ? `Your saved plan could not be read (${result.error}) A copy of the damaged data was kept in this browser and has not been deleted. You can download it, restore a backup, or start fresh.`
        : `Your saved plan could not be read (${result.error}) There was no room to keep a separate copy, so the damaged data was left where it is and changes will not be saved over it. Download it first, then restore a backup.`,
      actions: [{ label: 'Download damaged data', run: downloadRecoveryCopies }, { label: 'Restore a backup', run: () => go({ name: 'settings' }) }],
      dismissible: true,
    });
  } else if (result.status === 'unavailable') {
    addBanner({ id: 'nostorage', tone: 'warn', text: 'This browser is not letting the planner save anything (private browsing or strict settings can cause this). Your work will be lost when you close this page unless you export a backup.', actions: [{ label: 'Export backup', run: exportBackup }], dismissible: false });
  } else if (result.status === 'ok' && result.warnings.length) {
    addBanner({ id: 'warnings', tone: 'info', text: `Your saved plan loaded with ${result.warnings.length} minor problem${result.warnings.length === 1 ? '' : 's'} corrected: ${result.warnings.join(' ')}`, actions: [], dismissible: true });
  }
}

function startCommon(): void {

  // Online copy (whenimgone.grayhek.com or any web host): say plainly where data lives and point at Export backup.
  const hosted = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let noticeDismissed = false;
  try {
    noticeDismissed = localStorage.getItem(KEYS.hostedNotice) === 'dismissed';
  } catch {
    // Storage unavailable; show the notice.
  }
  if (hosted && !noticeDismissed) {
    addBanner({
      id: 'hosted', tone: 'info',
      text: 'You are using the online version. Your plan is saved only in this browser on this device and is never sent anywhere. Export backup saves a copy of the app and your plan that opens offline, with no website needed.',
      actions: [
        { label: 'Export backup', run: exportBackup },
        { label: 'Got it', run: () => {
          try { localStorage.setItem(KEYS.hostedNotice, 'dismissed'); } catch { /* ignore */ }
          removeBanner('hosted');
        } },
      ],
      dismissible: false,
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === getPlanKey()) {
      addBanner({ id: 'other-tab', tone: 'warn', text: 'This plan was changed in another tab or window. Reload to see the latest version before making more changes, or the other changes may be overwritten.', actions: [{ label: 'Reload', run: () => location.reload() }], dismissible: true });
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      // Not over an open dialog: a search result would navigate underneath it and stack a second dialog.
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && document.getElementById('sidebar')?.classList.contains('open')) {
      setMenu(false);
    }
  });
  document.getElementById('mobile-overlay')!.addEventListener('click', () => setMenu(false));
  mobileQuery.addEventListener('change', () => setMenu(false, false));
  setMenu(false, false);
  render();
}
