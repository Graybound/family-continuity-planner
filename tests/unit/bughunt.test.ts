/**
 * Regression tests for bugs found in the November 2026 bug hunt. Each one
 * failed before its fix.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEYS, getStorage, loadPlan, recoveryKeys, savePlan, type StorageLike } from '../../src/core/storage';
import { parseBackup } from '../../src/core/backup';
import { looksLikeSecret } from '../../src/core/audit';
import { samplePlan } from '../../src/core/sample';

const NOW = new Date('2026-11-07T12:00:00Z');

/** Storage that holds at most `capacity` characters, like a browser quota. */
class QuotaStorage implements StorageLike {
  map = new Map<string, string>();
  constructor(public capacity: number) {}
  get length() { return this.map.size; }
  private used() { let n = 0; for (const [k, v] of this.map) n += k.length + v.length; return n; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) {
    const prev = this.map.get(k);
    const after = this.used() - (prev === undefined ? 0 : k.length + prev.length) + k.length + v.length;
    if (after > this.capacity) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
}

describe('full browser storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('still loads the saved plan when storage is completely full', () => {
    const saved = JSON.stringify(samplePlan(NOW));
    const s = new QuotaStorage(KEYS.plan.length + saved.length);
    s.setItem(KEYS.plan, saved);
    vi.stubGlobal('localStorage', s);
    const storage = getStorage();
    expect(storage).not.toBeNull();
    const r = loadPlan(storage, NOW);
    expect(r.status).toBe('ok');
    expect(r.plan.info.planName).toBe('The Morgan Household (sample)');
  });

  it('reports storage as unavailable when the browser blocks it entirely', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new DOMException('denied', 'SecurityError'); },
      setItem() { throw new DOMException('denied', 'SecurityError'); },
      removeItem() {},
      key() { return null; },
      length: 0,
    });
    expect(getStorage()).toBeNull();
  });

  it('never overwrites unreadable saved data when there is no room for a recovery copy', () => {
    const notes = 'x'.repeat(5000);
    const raw = `{"schema":"family-continuity-planner","schemaVersion":2,"records":{"notes":[{"name":"Precious","details":"${notes}"}]}, TRUNCATED`;
    const s = new QuotaStorage(KEYS.plan.length + raw.length + 100);
    s.setItem(KEYS.plan, raw);
    const r = loadPlan(s, NOW);
    expect(r.status).toBe('damaged');
    if (r.status !== 'damaged') return;
    expect(r.recoveryKey).toBeNull();
    // The blank plan is smaller than the damaged text, so a plain write would succeed and destroy it.
    const result = savePlan(s, r.plan);
    expect(result.ok).toBe(false);
    expect(s.getItem(KEYS.plan)).toBe(raw);
  });

  it('saves normally over unreadable data once a recovery copy exists', () => {
    const raw = '{not json';
    const s = new QuotaStorage(1_000_000);
    s.setItem(KEYS.plan, raw);
    const r = loadPlan(s, NOW);
    expect(savePlan(s, r.plan).ok).toBe(true);
    expect(recoveryKeys(s).map((k) => s.getItem(k))).toEqual([raw]);
  });

  it('recognizes the Firefox quota error as "storage is full"', () => {
    const s = new QuotaStorage(0);
    s.setItem = () => { throw new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED'); };
    const r = savePlan(s, samplePlan(NOW));
    expect(!r.ok && r.error).toMatch(/full/);
  });
});

describe('backups from a newer version', () => {
  it('warns, with a count, when a backup has a section this version does not know', () => {
    const text = JSON.stringify({
      schema: 'family-continuity-planner', schemaVersion: 2,
      records: { people: [{ name: 'A' }], technology: [{ name: 'Home server' }, { name: 'Wi-Fi' }] },
    });
    const r = parseBackup(text, { now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.warnings.join(' ')).toMatch(/section called "technology".*2 entries.*not loaded/);
  });
});

describe('possible secret detection', () => {
  it('does not flag a note that only says where a password is kept', () => {
    expect(looksLikeSecret('Password: in the password manager, under "Router"')).toBe(false);
    expect(looksLikeSecret('PIN: see the envelope in the safe')).toBe(false); // privacy-scan: allow
    expect(looksLikeSecret('Password: stored in Bitwarden')).toBe(false); // privacy-scan: allow
  });
  it('still flags real values, including ones that start like a pointer word', () => {
    expect(looksLikeSecret('Password: hunter2')).toBe(true); // privacy-scan: allow
    expect(looksLikeSecret('password=in3cure!')).toBe(true); // privacy-scan: allow
  });
});
