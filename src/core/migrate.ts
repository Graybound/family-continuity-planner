/**
 * Schema detection and migration.
 *
 * Version 1 is the recovered single-file app. Its files have `version: 1` and
 * keep each section as a top-level array. Version 2 adds an explicit schema
 * marker and groups records under `records`.
 *
 * Version 3 adds the author's name (info.ownerName) and the date a saved copy
 * was opened on the family's device (info.familyOpenedAt). The Belongings and
 * Technology sections join version 3 too: until a release ships version 3,
 * they extend migrateV2toV3 instead of adding version 4.
 *
 * To add a version: write migrateVnToVn+1, register it in MIGRATIONS, bump
 * SCHEMA_VERSION, and add a fixture plus tests. Never edit a migration a release has shipped.
 */
import { isPlainObject } from './normalize';
import { SCHEMA_ID, SCHEMA_VERSION } from './plan';

type Obj = Record<string, unknown>;

export type Detected =
  | { ok: true; version: number; raw: Obj }
  | { ok: false; error: string };

export function detectVersion(raw: unknown, { lenient = false } = {}): Detected {
  if (!isPlainObject(raw)) return { ok: false, error: 'The file does not contain a plan. It may be a different kind of file.' };
  if (raw.schema === SCHEMA_ID) {
    const v = raw.schemaVersion;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 2) return { ok: false, error: 'The file has an unrecognized schema version.' };
    if (v > SCHEMA_VERSION) {
      return { ok: false, error: `This backup was made by a newer version of Family Continuity Planner (schema ${v}). Download the latest release to open it. Your current plan was not changed.` };
    }
    return { ok: true, version: v, raw };
  }
  if (raw.schema !== undefined) return { ok: false, error: 'This file belongs to a different application.' };
  const looksV1 = (raw.version === 1 || raw.version === undefined) && isPlainObject(raw.meta) && Array.isArray(raw.checklist);
  if (looksV1 || (lenient && (raw.version === 1 || isPlainObject(raw.meta)))) return { ok: true, version: 1, raw };
  return { ok: false, error: 'This file is not a Family Continuity Planner backup.' };
}

const V1_SECTIONS = ['people', 'contacts', 'health', 'home', 'accounts', 'documents', 'plans', 'notes'] as const;

export function migrateV1toV2(v1: Obj, actions: string[]): Obj {
  const meta = isPlainObject(v1.meta) ? v1.meta : {};
  const records: Obj = {};
  for (const s of V1_SECTIONS) records[s] = v1[s];
  const notes = Array.isArray(records.notes) ? [...(records.notes as unknown[])] : [];
  if (typeof meta.meetup === 'string' && meta.meetup.trim()) {
    notes.push({ name: 'Household meeting point', category: 'General', details: meta.meetup });
    actions.push('Moved the household meeting point into Notes.');
  }
  records.notes = notes;
  actions.push('Converted the plan from the original format (version 1) to version 2.');
  actions.push('Renamed "Household or plan name" to "Plan name".');
  actions.push('Added the new "Who handles what" section, Start Here message, and continuity review. They start empty.');
  const known = new Set(['version', 'meta', 'checklist', 'activity', ...V1_SECTIONS]);
  const extra = Object.keys(v1).filter((k) => !known.has(k));
  if (extra.length) actions.push(`Ignored ${extra.length} unrecognized top-level field${extra.length === 1 ? '' : 's'}.`);
  return {
    schema: SCHEMA_ID,
    schemaVersion: 2,
    info: {
      planName: meta.householdName,
      region: meta.region,
      trustedContact: meta.trustedContact,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    },
    preferences: {
      privacyDefault: meta.privacyDefault,
      includePrivateInPrint: meta.includePrivatePrint,
    },
    records,
    checklist: v1.checklist,
    activity: v1.activity,
  };
}

/**
 * Version 2 to 3. New fields start empty; normalizePlan fills them, and new
 * sections in SECTION_IDS get an empty list the same way, so this step only
 * moves the version and explains what was added.
 */
export function migrateV2toV3(v2: Obj, actions: string[]): Obj {
  actions.push('Upgraded the plan to version 3. Added a place for your name, used in saved file names, and for the date a saved copy was opened on your family\'s device. Both start empty.');
  return { ...v2, schemaVersion: 3 };
}

const MIGRATIONS: Record<number, (raw: Obj, actions: string[]) => Obj> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
};

export function migrateToCurrent(detected: { version: number; raw: Obj }): { raw: Obj; actions: string[] } {
  const actions: string[] = [];
  let raw = detected.raw;
  for (let v = detected.version; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from schema ${v}`);
    raw = step(raw, actions);
  }
  return { raw, actions };
}
