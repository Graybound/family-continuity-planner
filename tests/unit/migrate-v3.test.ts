import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBackup, serializeBackup } from '../../src/core/backup';
import { detectVersion } from '../../src/core/migrate';
import { SCHEMA_VERSION } from '../../src/core/plan';
import { samplePlan } from '../../src/core/sample';

const V2 = readFileSync(new URL('../fixtures/v2-sample-plan.json', import.meta.url), 'utf8');
const V1 = readFileSync(new URL('../fixtures/legacy-v1-export.json', import.meta.url), 'utf8');

describe('schema version 3', () => {
  it('is the current version', () => {
    expect(SCHEMA_VERSION).toBe(3);
  });
  it('upgrades a version 2 backup, keeps every entry, and says what was added', () => {
    const before = JSON.parse(V2);
    const r = parseBackup(V2);
    if (!r.ok) throw new Error(r.error);
    expect(r.preview.sourceVersion).toBe(2);
    expect(r.plan.schemaVersion).toBe(3);
    expect(r.plan.info.ownerName).toBe('');
    expect(r.plan.info.familyOpenedAt).toBe('');
    expect(r.plan.records.people).toEqual(before.records.people);
    expect(r.plan.checklist).toEqual(before.checklist);
    expect(r.preview.actions.join(' ')).toMatch(/version 3/);
    expect(r.preview.warnings).toEqual([]);
  });
  it('upgrades a version 1 backup through version 2 to 3', () => {
    const r = parseBackup(V1, { lenient: true });
    if (!r.ok) throw new Error(r.error);
    expect(r.plan.schemaVersion).toBe(3);
    expect(r.preview.actions.some((a) => a.includes('version 2'))).toBe(true);
    expect(r.preview.actions.some((a) => a.includes('version 3'))).toBe(true);
  });
  it('round trips the new fields', () => {
    const plan = samplePlan(new Date('2026-11-26T12:00:00Z'));
    plan.info.ownerName = 'José Zoë';
    plan.info.familyOpenedAt = '2026-11-20';
    const r = parseBackup(serializeBackup(plan, '0.0.0'));
    expect(r.ok && r.plan.info).toEqual(plan.info);
  });
  it('drops an invalid opened date with a warning instead of failing', () => {
    const raw = JSON.parse(V2);
    raw.schemaVersion = 3;
    raw.info.familyOpenedAt = 'last Tuesday';
    const r = parseBackup(JSON.stringify(raw));
    expect(r.ok && r.plan.info.familyOpenedAt).toBe('');
    expect(r.ok && r.preview.warnings.length).toBeGreaterThan(0);
  });
  it('a version 2 app would refuse a version 3 file instead of dropping data', () => {
    // The v2 app's check: schemaVersion greater than its own (2) is refused as "made by a newer version".
    const out = JSON.parse(serializeBackup(samplePlan(), '0.0.0'));
    expect(out.schemaVersion).toBeGreaterThan(2);
  });
  it('refuses files from a newer version than this app', () => {
    const raw = JSON.parse(V2);
    raw.schemaVersion = SCHEMA_VERSION + 1;
    const d = detectVersion(raw);
    expect(d.ok).toBe(false);
  });
});
