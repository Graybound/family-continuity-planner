import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KEYS, loadPlan, recoveryKeys, savePlan, type StorageLike } from '../../src/core/storage';
import { samplePlan } from '../../src/core/sample';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  failWrites = false;
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
}

const NOW = new Date('2026-11-07T12:00:00Z');
const legacyText = readFileSync(new URL('../fixtures/legacy-v1-export.json', import.meta.url), 'utf8');

describe('storage', () => {
  it('starts empty with a starter checklist', () => {
    const r = loadPlan(new MemoryStorage(), NOW);
    expect(r.status).toBe('empty');
    expect(r.plan.checklist.length).toBe(4);
  });
  it('saves and loads the same plan', () => {
    const s = new MemoryStorage();
    const plan = samplePlan(NOW);
    expect(savePlan(s, plan).ok).toBe(true);
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('ok');
    expect(r.plan).toEqual(plan);
  });
  it('migrates the v1 key on first load and leaves it untouched', () => {
    const s = new MemoryStorage();
    s.setItem(KEYS.legacy, legacyText);
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('migrated-legacy');
    expect(r.plan.records.people).toHaveLength(2);
    savePlan(s, r.plan);
    expect(s.getItem(KEYS.legacy)).toBe(legacyText);
    expect(loadPlan(s, NOW).status).toBe('ok');
  });
  it('accepts v1 storage data the v1 app itself would have loaded (lenient)', () => {
    const s = new MemoryStorage();
    s.setItem(KEYS.legacy, JSON.stringify({ version: 1, meta: { householdName: 'X' }, people: [{ id: 'a', name: 'Y' }] }));
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('migrated-legacy');
    expect(r.plan.records.people[0]!.name).toBe('Y');
  });
  it('preserves damaged data in a recovery key instead of overwriting it', () => {
    const s = new MemoryStorage();
    const raw = '{"schema":"family-continuity-planner","schemaVersion":2,"records":{"people":[{"name":"Precious"}]}, TRUNCATED';
    s.setItem(KEYS.plan, raw);
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('damaged');
    if (r.status !== 'damaged') return;
    expect(r.recoveryKey).toMatch(/^familyContinuityPlanner\.recovery\./);
    savePlan(s, r.plan);
    expect(s.getItem(r.recoveryKey!)).toBe(raw);
    // Loading the damaged data again does not create a second copy.
    s.setItem(KEYS.plan, raw);
    loadPlan(s, NOW);
    expect(recoveryKeys(s)).toHaveLength(1);
  });
  it('reports damaged legacy data without touching it', () => {
    const s = new MemoryStorage();
    s.setItem(KEYS.legacy, '{oops');
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('damaged');
    expect(s.getItem(KEYS.legacy)).toBe('{oops');
  });
  it('reports unavailable storage and failed writes', () => {
    expect(loadPlan(null, NOW).status).toBe('unavailable');
    const s = new MemoryStorage();
    s.failWrites = true;
    const r = savePlan(s, samplePlan(NOW));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/full/);
  });
});
