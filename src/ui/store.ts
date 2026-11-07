/**
 * Application state. One plan object, one UI state object, and a single
 * render callback. Every change to the plan goes through mutate() or
 * replacePlan(), which persist it immediately.
 */
import { newId } from '../core/ids';
import { blankPlan, type Plan } from '../core/plan';
import type { SectionId } from '../core/sections';
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

export function getStorageRef(): StorageLike | null {
  return storage;
}

export function getPlan(): Plan {
  return plan;
}

export function render(): void {
  renderFn();
}

function persist(): boolean {
  const r = savePlan(storage, plan);
  if (!r.ok) {
    toast(r.error, 'error');
    return false;
  }
  return true;
}

export function mutate(fn: (p: Plan) => void, opts: { message?: string; log?: string; touch?: boolean } = {}): void {
  fn(plan);
  if (opts.touch !== false) plan.info.updatedAt = new Date().toISOString();
  if (opts.log) {
    plan.activity.unshift({ id: newId(), text: opts.log, at: new Date().toISOString() });
    plan.activity = plan.activity.slice(0, 30);
  }
  const ok = persist();
  if (ok && opts.message) toast(opts.message);
  render();
}

export function replacePlan(next: Plan, message?: string): void {
  plan = next;
  ui.privacy = plan.preferences.privacyDefault;
  ui.filters = {};
  const ok = persist();
  if (ok && message) toast(message);
  go({ name: 'dashboard' });
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
