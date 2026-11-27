/**
 * Application state. One plan object, one UI state object, and a single
 * render callback. Every change to the plan goes through mutate() or
 * replacePlan(), which persist it immediately.
 */
import { newId } from '../core/ids';
import { blankPlan, type Plan } from '../core/plan';
import type { SectionId } from '../core/sections';
import type { DraftMeta } from '../core/embedded';
import { KEYS, getStorage, loadPlan, savePlan, type LoadResult, type StorageLike } from '../core/storage';
import { toast } from './toast';

export type View =
  | { name: 'dashboard' }
  | { name: 'get-started'; step: number }
  | { name: 'start-here' }
  | { name: 'section'; section: SectionId }
  | { name: 'checklist' }
  | { name: 'review' }
  | { name: 'settings' };

export interface Banner {
  id: string;
  tone: 'info' | 'warn';
  text: string;
  actions: { label: string; run: () => void }[];
  dismissible: boolean;
}

export interface UiState {
  view: View;
  privacy: boolean;
  filters: Partial<Record<SectionId, { text: string; type: string }>>;
  banners: Banner[];
  /** Set after navigation so the new view's heading receives focus. */
  focusHeading: boolean;
}

let storage: StorageLike | null = null;
let plan: Plan = blankPlan();
let loadResult: LoadResult | null = null;
/** Where the plan is saved in this browser: the main key, or a saved plan file's own draft key. */
let planKey: string = KEYS.plan;
/** Set when this page is a saved plan file; stored next to the plan in its draft. */
let draftMeta: DraftMeta | null = null;
export const ui: UiState = { view: { name: 'dashboard' }, privacy: false, filters: {}, banners: [], focusHeading: false };
let renderFn: () => void = () => {};

export function init(onRender: () => void): LoadResult {
  renderFn = onRender;
  storage = getStorage();
  loadResult = loadPlan(storage);
  plan = loadResult.plan;
  ui.privacy = plan.preferences.privacyDefault;
  return loadResult;
}

/**
 * Start on the plan inside a saved plan file. Its edits are kept under the
 * file's own draft key, never the main plan key, so opening a file cannot
 * overwrite another plan saved in this browser.
 */
export function initFromFile(onRender: () => void, filePlan: Plan, key: string, meta: DraftMeta): { storageAvailable: boolean } {
  renderFn = onRender;
  storage = getStorage();
  planKey = key;
  draftMeta = meta;
  plan = filePlan;
  ui.privacy = plan.preferences.privacyDefault;
  return { storageAvailable: storage !== null };
}

/** True when this page is a saved plan file (the plan came from inside the file). */
export function isSavedFile(): boolean {
  return draftMeta !== null;
}

export function getPlanKey(): string {
  return planKey;
}

/** Record that the current plan was written to a file, so reopening the older file can say where it went. */
export function noteSavedAs(fileName: string): void {
  if (!draftMeta) return;
  draftMeta = { ...draftMeta, savedAs: fileName, savedAsUpdatedAt: plan.info.updatedAt };
  persist(true);
}

/** Forget this file's draft. */
export function discardDraft(): void {
  if (!storage || !draftMeta) return;
  try {
    storage.removeItem(planKey);
  } catch {
    // Nothing to do; the draft stays and is offered again next time.
  }
}

export function getStorageRef(): StorageLike | null {
  return storage;
}

export function getPlan(): Plan {
  return plan;
}

export function render(): void {
  renderFn();
}

function persist(silent = false): boolean {
  const r = savePlan(storage, plan, planKey, draftMeta ? { ...draftMeta } : undefined);
  if (!r.ok) {
    if (!silent) toast(r.error, 'error');
    return false;
  }
  return true;
}

export function mutate(fn: (p: Plan) => void, opts: { message?: string; log?: string; touch?: boolean; silentSaveError?: boolean } = {}): void {
  fn(plan);
  if (opts.touch !== false) plan.info.updatedAt = new Date().toISOString();
  if (opts.log) {
    plan.activity.unshift({ id: newId(), text: opts.log, at: new Date().toISOString() });
    plan.activity = plan.activity.slice(0, 30);
  }
  const ok = persist(opts.silentSaveError);
  if (ok && opts.message) toast(opts.message);
  render();
}

/**
 * Replace the whole plan. Saves first and keeps the current plan when the save fails
 * (for example a restore bigger than the space left), so a failed restore never looks
 * like it worked and then reverts on reload. Returns false when nothing was replaced.
 * With no storage at all the plan can only live in memory, so it is swapped in anyway;
 * the "not saving" banner already tells the reader to export.
 */
export function replacePlan(next: Plan, message?: string): boolean {
  if (storage) {
    const r = savePlan(storage, next, planKey, draftMeta ? { ...draftMeta } : undefined);
    if (!r.ok) {
      toast(`Nothing was replaced; your current plan is unchanged. ${r.error.split('.')[0]}.`, 'error');
      return false;
    }
  }
  plan = next;
  ui.privacy = plan.preferences.privacyDefault;
  ui.filters = {};
  if (message) toast(message);
  go({ name: 'dashboard' });
  return true;
}

export function go(view: View): void {
  ui.view = view;
  ui.focusHeading = true;
  render();
  window.scrollTo({ top: 0 });
}

export function addBanner(b: Omit<Banner, 'id'> & { id?: string }): void {
  const id = b.id ?? newId();
  ui.banners = ui.banners.filter((x) => x.id !== id);
  ui.banners.push({ ...b, id });
  render();
}

export function removeBanner(id: string): void {
  ui.banners = ui.banners.filter((x) => x.id !== id);
  render();
}

/** Remove every planner key from this browser, including the v1 key and recovery copies. */
export function eraseAllLocalData(): void {
  if (storage) {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith('familyContinuityPlanner.') && k !== KEYS.theme) keys.push(k);
    }
    keys.forEach((k) => storage!.removeItem(k));
  }
  plan = blankPlan();
  ui.privacy = false;
  ui.filters = {};
  ui.banners = [];
  persist();
  go({ name: 'dashboard' });
}
