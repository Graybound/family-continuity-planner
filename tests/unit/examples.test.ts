// Keeps the files in examples/ valid. Regenerate the sample with:
//   UPDATE_EXAMPLES=1 npx vitest run tests/unit/examples.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { parseBackup, serializeBackup } from '../../src/core/backup';
import { samplePlan } from '../../src/core/sample';

const SAMPLE = new URL('../../examples/sample-plan.json', import.meta.url);
const LEGACY = new URL('../../examples/legacy-v1-backup.json', import.meta.url);

if (process.env.UPDATE_EXAMPLES) {
  const now = new Date('2026-11-01T12:00:00Z');
  writeFileSync(SAMPLE, serializeBackup(samplePlan(now), 'sample', now) + '\n');
  copyFileSync(new URL('../fixtures/legacy-v1-export.json', import.meta.url), LEGACY);
}

describe('examples', () => {
  it('sample-plan.json is a valid, clean, sample-flagged backup', () => {
    const r = parseBackup(readFileSync(SAMPLE, 'utf8'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.warnings).toEqual([]);
    expect(r.plan.info.isSample).toBe(true);
  });
  it('legacy-v1-backup.json restores through migration', () => {
    const r = parseBackup(readFileSync(LEGACY, 'utf8'));
    expect(r.ok && r.preview.sourceVersion).toBe(1);
  });
});
