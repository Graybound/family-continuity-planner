import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBackup, parseBackupFile, serializeBackup } from '../../src/core/backup';
import {
  EMBED_ID, decideDraft, draftKey, escapeJsonForHtml, readDraftMeta, extractEmbeddedBackup, fileNamePart, localIsoWithOffset, savedFileStem, savedHeadline,
} from '../../src/core/embedded';
import { samplePlan } from '../../src/core/sample';
import { formatSavedTime } from '../../src/core/dates';

const NOW = new Date('2026-11-26T20:32:05Z');
const HOSTILE = 'x</script><script>window.PWNED=1</script><!-- <script> \u2028\u2029 & é 😀 </SCRIPT >';

function hostilePlan() {
  const plan = samplePlan(NOW);
  plan.info.planName = HOSTILE;
  plan.messages[0]!.body = HOSTILE;
  plan.records.contacts[0]!.instructions = HOSTILE;
  return plan;
}

function savedFile(json: string): string {
  return `<!doctype html>\n<html><head><script>/* app */</script></head><body><div id="app"></div><script type="application/json" id="${EMBED_ID}">${escapeJsonForHtml(json)}</script>\n</body></html>`;
}

describe('escapeJsonForHtml', () => {
  it('leaves nothing that can end the script element, and parses back to the same value', () => {
    const json = serializeBackup(hostilePlan(), '0.0.0', NOW);
    const escaped = escapeJsonForHtml(json);
    expect(escaped).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(escaped)).toEqual(JSON.parse(json));
  });
});

describe('extractEmbeddedBackup', () => {
  it('returns the block text', () => {
    const json = serializeBackup(hostilePlan(), '0.0.0', NOW);
    expect(JSON.parse(extractEmbeddedBackup(savedFile(json))!)).toEqual(JSON.parse(json));
  });
  it('finds the block whatever the attribute order', () => {
    expect(extractEmbeddedBackup(`<body><script id="${EMBED_ID}" type="application/json">{"a":1}</script></body>`)).toBe('{"a":1}');
  });
  it('returns null without a block, or when the block is cut off', () => {
    expect(extractEmbeddedBackup('<html><body><script>1</script></body></html>')).toBeNull();
    expect(extractEmbeddedBackup(`<body><script type="application/json" id="${EMBED_ID}">{"a":`)).toBeNull();
  });
});

describe('parseBackupFile', () => {
  it('gives the same plan from a saved plan file as from the JSON backup', () => {
    const json = serializeBackup(hostilePlan(), '0.0.0', NOW);
    const fromJson = parseBackup(json, { now: NOW });
    const fromHtml = parseBackupFile(savedFile(json), { now: NOW });
    if (!fromJson.ok || !fromHtml.ok) throw new Error('did not parse');
    expect(fromHtml.plan).toEqual(fromJson.plan);
    expect(fromHtml.plan.messages[0]!.body).toBe(HOSTILE);
  });
  it('explains an HTML file with no plan inside', () => {
    const r = parseBackupFile('<!doctype html><html><body>hello</body></html>');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/does not contain a saved plan/);
  });
  it('still reads JSON backups, including the shipped example', () => {
    const r = parseBackupFile(readFileSync(new URL('../../examples/sample-plan.json', import.meta.url), 'utf8'));
    expect(r.ok).toBe(true);
  });
  it('runs the same checks on the plan inside an HTML file', () => {
    const r = parseBackupFile(savedFile('{"schema":"something-else","schemaVersion":2}'));
    expect(r.ok).toBe(false);
  });
});

describe('fileNamePart', () => {
  it('keeps letters in any language and turns spaces into underscores', () => {
    expect(fileNamePart('Noah Grayhek')).toBe('Noah_Grayhek');
    expect(fileNamePart('José Zoë Ñúñez')).toBe('José_Zoë_Ñúñez');
    expect(fileNamePart('李 小龙')).toBe('李_小龙');
  });
  it('drops apostrophes, punctuation and characters Windows or macOS refuse', () => {
    expect(fileNamePart("Pat O'Brien-Lee")).toBe('Pat_OBrien_Lee');
    expect(fileNamePart('a<b>c:d"e/f\\g|h?i*j.k,l')).toBe('abcdefghijkl');
    expect(fileNamePart('  ...  ')).toBe('');
  });
  it('caps the length without leaving a trailing underscore', () => {
    const part = fileNamePart('A'.repeat(39) + ' B' + 'C'.repeat(50));
    expect(Array.from(part).length).toBeLessThanOrEqual(40);
    expect(part.endsWith('_')).toBe(false);
  });
});

describe('savedFileStem', () => {
  const t = new Date(2026, 10, 26, 14, 32, 5);
  it('uses local date and time, always with seconds, and no colons', () => {
    expect(savedFileStem(t)).toBe('WhenImGone_2026-11-26_1432_05');
    expect(savedFileStem(t, 'Noah Grayhek')).toBe('WhenImGone_Noah_Grayhek_2026-11-26_1432_05');
    expect(savedFileStem(t, '  ')).toBe('WhenImGone_2026-11-26_1432_05');
    expect(savedFileStem(new Date(2026, 10, 26, 14, 32, 0))).toBe('WhenImGone_2026-11-26_1432_00');
  });
  it('sorts in time order, as text, number-aware, and ignoring punctuation', () => {
    const names = [
      savedFileStem(new Date(2026, 10, 26, 14, 33, 0)),
      savedFileStem(t),
      savedFileStem(new Date(2026, 10, 26, 14, 32, 0)),
      savedFileStem(new Date(2026, 10, 26, 9, 5, 59)),
    ].map((n) => `${n}.html`);
    const expected = ['WhenImGone_2026-11-26_0905_59.html', 'WhenImGone_2026-11-26_1432_00.html', 'WhenImGone_2026-11-26_1432_05.html', 'WhenImGone_2026-11-26_1433_00.html'];
    // Collation that ignores punctuation (ICU, as macOS Finder may sort):
    expect([...names].sort(new Intl.Collator('en', { numeric: true, ignorePunctuation: true }).compare)).toEqual(expected);
    expect([...names].sort(new Intl.Collator('en', { numeric: true }).compare)).toEqual(expected);
    expect([...names].sort()).toEqual(expected);
    // Number-aware sorting that compares other characters by code (like Windows Explorer):
    const numericOrdinal = (a: string, b: string) => {
      const pa = a.match(/\d+|\D/g)!, pb = b.match(/\d+|\D/g)!;
      for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
        const [x, y] = [pa[i]!, pb[i]!];
        if (x === y) continue;
        if (/\d/.test(x) && /\d/.test(y)) return Number(x) - Number(y);
        return x < y ? -1 : 1;
      }
      return pa.length - pb.length;
    };
    expect([...names].sort(numericOrdinal)).toEqual(expected);
  });
});

describe('localIsoWithOffset', () => {
  it('is the same instant as the input', () => {
    expect(Date.parse(localIsoWithOffset(NOW))).toBe(NOW.getTime());
  });
});

describe('drafts', () => {
  const file = { savedOn: '2026-11-26T14:32:05-06:00', updatedAt: '2026-11-26T20:30:00.000Z' };
  const meta = { draftOf: file.savedOn };
  it('keys a draft to the file address, so two files never share one', () => {
    const a = draftKey({ protocol: 'file:', host: '', pathname: '/Users/x/WhenImGone_2026-11-26_1432_05.html' });
    const b = draftKey({ protocol: 'file:', host: '', pathname: '/Users/x/WhenImGone_2026-11-26_1500.html' });
    expect(a).not.toBe(b);
    expect(a.startsWith('familyContinuityPlanner.draft.')).toBe(true);
    expect(draftKey({ protocol: 'https:', host: 'whenimgone.grayhek.com', pathname: '/' })).toBe('familyContinuityPlanner.draft.https://whenimgone.grayhek.com/');
  });
  it('shows the file when there is no draft or nothing changed', () => {
    expect(decideDraft(null, file)).toBe('none');
    expect(decideDraft({ meta, updatedAt: file.updatedAt }, file)).toBe('none');
  });
  it('offers unsaved changes back', () => {
    expect(decideDraft({ meta, updatedAt: '2026-11-26T21:00:00.000Z' }, file)).toBe('unsaved');
    // Saved once, then changed again: still unsaved.
    expect(decideDraft({ meta: { ...meta, savedAs: 'A.html', savedAsUpdatedAt: '2026-11-26T21:00:00.000Z' }, updatedAt: '2026-11-26T21:05:00.000Z' }, file)).toBe('unsaved');
  });
  it('says where changes went when they were saved to a newer file', () => {
    expect(decideDraft({ meta: { ...meta, savedAs: 'A.html', savedAsUpdatedAt: '2026-11-26T21:00:00.000Z' }, updatedAt: '2026-11-26T21:00:00.000Z' }, file)).toBe('saved-elsewhere');
  });
  it('ignores a draft left by a different file at the same address', () => {
    expect(decideDraft({ meta: { draftOf: '2026-01-01T00:00:00Z' }, updatedAt: '2026-11-26T21:00:00.000Z' }, file)).toBe('stale');
  });
  it('reads draft fields defensively', () => {
    expect(readDraftMeta(null)).toBeNull();
    expect(readDraftMeta({ draftOf: 5 })).toBeNull();
    expect(readDraftMeta({ draftOf: 'x', savedAs: 3 })).toEqual({ draftOf: 'x', savedAs: undefined, savedAsUpdatedAt: undefined });
  });
});

describe('saved time and headline', () => {
  it('shows the time the saver saw, whatever the reader\'s time zone', () => {
    expect(formatSavedTime('2026-11-26T14:32:05-06:00', 'en-US')).toBe('Thursday, November 26, 2026 at 2:32 PM');
    expect(formatSavedTime('2026-11-26T14:32:05+09:00', 'en-US')).toBe('Thursday, November 26, 2026 at 2:32 PM');
  });
  it('falls back to the reader\'s time for UTC times, and to nothing for junk', () => {
    expect(formatSavedTime('2026-11-26T20:32:05.000Z', 'en-US')).toMatch(/2026/);
    expect(formatSavedTime('not a time')).toBe('');
    expect(formatSavedTime('')).toBe('');
  });
  it('names whose plan it is when there is a name', () => {
    expect(savedHeadline('Alex Morgan', 'Thursday, November 26, 2026 at 2:32 PM')).toBe("Alex Morgan's plan, saved Thursday, November 26, 2026 at 2:32 PM.");
    expect(savedHeadline('  ', 'Thursday, November 26, 2026 at 2:32 PM')).toBe('This plan was saved Thursday, November 26, 2026 at 2:32 PM.');
    expect(savedHeadline('', '')).toBe('');
  });
});
