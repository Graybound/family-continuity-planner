/**
 * App shell: navigation, top bar, banners, and routing between views.
 * The whole view is rebuilt on each change; focus is preserved through
 * data-focus-key (see dom.ts), and moved to the new heading after navigation.
 */
import { activeFindings } from '../core/audit';
import { SECTIONS, SECTION_IDS } from '../core/sections';
import { KEYS } from '../core/storage';
import { captureFocus, clear, h, icon, restoreFocus } from './dom';
import { downloadRecoveryCopies, exportBackup, removeSampleData } from './backupFlow';
import { openPrintDialog } from './printDialog';
import { openSearch } from './searchDialog';
import { addBanner, getPlan, go, init, removeBanner, render, ui, type View } from './store';
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
    { view: { name: 'get-started', step: 0 }, label: 'Get started', glyph: '➜' },
    { view: { name: 'start-here' }, label: 'Start Here', glyph: '✉' },
    'sep',
    ...SECTION_IDS.map((s): NavItem => ({ view: { name: 'section', section: s }, label: SECTIONS[s].title, glyph: SECTIONS[s].icon, count: () => plan.records[s].length, countLabel: 'entries' })),
    { view: { name: 'checklist' }, label: 'Checklist', glyph: '✓', count: () => plan.checklist.filter((c) => !c.done).length, countLabel: 'open items' },
    'sep',
    { view: { name: 'review' }, label: 'Continuity review', glyph: '⚑', count: () => activeFindings(plan).active.length, countLabel: 'suggestions' },
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
  const btn = (label: string, glyph: string, onClick: () => void, extra: Record<string, string> = {}) =>
    h('button', { class: 'btn', attrs: { type: 'button', title: label, 'data-focus-key': `top:${label}`, ...extra }, on: { click: onClick } }, icon(glyph), h('span', { class: 'label-collapse' }, label));
  bar.append(
    h('button', { class: 'btn mobile-menu', attrs: { id: 'menu-btn', type: 'button', 'aria-controls': 'sidebar', 'aria-expanded': 'false' }, on: { click: () => setMenu(true) } }, icon('☰'), h('span', { class: 'label-collapse' }, 'Menu')),
    h('button', { class: 'search-btn', attrs: { type: 'button', 'data-focus-key': 'top:search', 'aria-keyshortcuts': 'Control+K Meta+K' }, on: { click: openSearch } }, icon('⌕'), h('span', null, 'Search your plan'), h('kbd', { attrs: { 'aria-hidden': 'true' } }, 'Ctrl K')),
    h('div', { class: 'top-actions' },
      btn(dark ? 'Light mode' : 'Dark mode', dark ? '☀' : '☾', () => {
        applyTheme(dark ? 'light' : 'dark');
        toast(dark ? 'Light mode on' : 'Dark mode on');
        render();
      }),
      btn('Privacy mode', '◉', () => {
        ui.privacy = !ui.privacy;
        toast(ui.privacy ? 'Privacy mode on: private details hidden' : 'Privacy mode off: private details shown');
        render();
      }, { 'aria-pressed': String(ui.privacy) }),
      btn('Export backup', '⇩', exportBackup),
      btn('Print', '⎙', openPrintDialog),
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
  document.title = `${plan.info.planName ? `${plan.info.planName} | ` : ''}Family Continuity Planner`;
  if (ui.focusHeading) {
    ui.focusHeading = false;
    view.querySelector<HTMLElement>('.view-title')?.focus();
  } else {
    restoreFocus(saved);
  }
}

export function start(): void {
  const result = init(renderApp);
  if (result.status === 'migrated-legacy') {
    addBanner({ id: 'migrated', tone: 'info', text: 'Your plan from the original version of this app was upgraded. Nothing was deleted: the original saved copy is still in this browser. Exporting a fresh backup now is a good idea.', actions: [{ label: 'Export backup', run: exportBackup }], dismissible: true });
  } else if (result.status === 'damaged') {
    addBanner({
      id: 'damaged', tone: 'warn',
      text: `Your saved plan could not be read (${result.error}) A copy of the damaged data was kept in this browser and has not been deleted. You can download it, restore a backup, or start fresh.`,
      actions: [{ label: 'Download damaged data', run: downloadRecoveryCopies }, { label: 'Restore a backup', run: () => go({ name: 'settings' }) }],
      dismissible: true,
    });
  } else if (result.status === 'unavailable') {
    addBanner({ id: 'nostorage', tone: 'warn', text: 'This browser is not letting the planner save anything (private browsing or strict settings can cause this). Your work will be lost when you close this page unless you export a backup.', actions: [{ label: 'Export backup', run: exportBackup }], dismissible: false });
  } else if (result.status === 'ok' && result.warnings.length) {
    addBanner({ id: 'warnings', tone: 'info', text: `Your saved plan loaded with ${result.warnings.length} minor problem${result.warnings.length === 1 ? '' : 's'} corrected: ${result.warnings.join(' ')}`, actions: [], dismissible: true });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === KEYS.plan) {
      addBanner({ id: 'other-tab', tone: 'warn', text: 'This plan was changed in another tab or window. Reload to see the latest version before making more changes, or the other changes may be overwritten.', actions: [{ label: 'Reload', run: () => location.reload() }], dismissible: true });
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
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
