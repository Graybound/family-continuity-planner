/**
 * Browser localStorage persistence with safe recovery.
 *
 * Keys:
 *   familyContinuityPlanner.v2          current plan (schema 2 JSON)
 *   familyContinuityPlanner.v1          plan written by the recovered v1 app; read once, never modified
 *   familyContinuityPlanner.theme       "light" or "dark", same key the v1 app used
 *   familyContinuityPlanner.recovery.*  copy of saved data that could not be read
 *
 * The v1 app replaced unreadable data with a blank plan and then overwrote it
 * on the next save. This module never does that: unreadable data is copied to
 * a recovery key before anything else can be written.
 */
import { parseBackup } from './backup';
import { blankPlan, type Plan } from './plan';

export const KEYS = {
  plan: 'familyContinuityPlanner.v2',
  legacy: 'familyContinuityPlanner.v1',
  theme: 'familyContinuityPlanner.theme',
  recoveryPrefix: 'familyContinuityPlanner.recovery.',
} as const;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export type LoadResult =
  | { status: 'empty'; plan: Plan }
  | { status: 'ok'; plan: Plan; warnings: string[] }
  | { status: 'migrated-legacy'; plan: Plan; actions: string[]; warnings: string[] }
  | { status: 'damaged'; plan: Plan; error: string; recoveryKey: string | null }
  | { status: 'unavailable'; plan: Plan };

export function getStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    const probe = 'familyContinuityPlanner.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function preserveDamaged(storage: StorageLike, raw: string, now: Date): string | null {
  // If the identical text is already preserved, do not store a second copy.
  for (const k of recoveryKeys(storage)) if (storage.getItem(k) === raw) return k;
  const key = KEYS.recoveryPrefix + now.toISOString();
  try {
    storage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

export function recoveryKeys(storage: StorageLike): string[] {
  const out: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(KEYS.recoveryPrefix)) out.push(k);
  }
  return out.sort();
}

export function loadPlan(storage: StorageLike | null, now: Date = new Date()): LoadResult {
  if (!storage) return { status: 'unavailable', plan: blankPlan(now) };
  let raw: string | null;
  try {
    raw = storage.getItem(KEYS.plan);
  } catch {
    return { status: 'unavailable', plan: blankPlan(now) };
  }
  if (raw !== null) {
    const r = parseBackup(raw, { lenient: false, now });
    if (r.ok) return { status: 'ok', plan: r.plan, warnings: r.preview.warnings };
    // Do not treat the data as empty. Keep it, and make the saved copy blank only after preserving it.
    const recoveryKey = preserveDamaged(storage, raw, now);
    return { status: 'damaged', plan: blankPlan(now), error: r.error, recoveryKey };
  }
  let legacy: string | null;
  try {
    legacy = storage.getItem(KEYS.legacy);
  } catch {
    legacy = null;
  }
  if (legacy !== null) {
    const r = parseBackup(legacy, { lenient: true, now });
    if (r.ok) return { status: 'migrated-legacy', plan: r.plan, actions: r.preview.actions, warnings: r.preview.warnings };
    // The legacy key is never written by this version, so it is already preserved in place.
    return { status: 'damaged', plan: blankPlan(now), error: r.error, recoveryKey: KEYS.legacy };
  }
  return { status: 'empty', plan: blankPlan(now) };
}

export function savePlan(storage: StorageLike | null, plan: Plan): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: 'This browser is not allowing the planner to save. Export a backup before closing.' };
  try {
    storage.setItem(KEYS.plan, JSON.stringify(plan));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, error: quota ? 'Browser storage is full, so the last change was not saved. Export a backup now.' : 'The last change could not be saved. Export a backup now.' };
  }
}
