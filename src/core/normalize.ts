/**
 * Validation and normalization of plan data.
 *
 * Everything that enters the app (local storage, imported backups) passes
 * through normalizePlan(). It builds a brand new object containing only known
 * keys with correctly typed values. Untrusted objects are never merged,
 * spread, or assigned into application state.
 */
import { SAFE_ID, newId } from './ids';
import { isValidDateString, isValidIsoTime } from './dates';
import {
  AREA_HANDLERS,
  SCHEMA_ID,
  SCHEMA_VERSION,
  STORED_MODULE_STATUSES,
  blankPlan,
  emptyRecords,
  isAreaId,
  isRiskId,
  type AreaHandler,
  type ChecklistItem,
  type Message,
  type Plan,
  type RecordItem,
  type StoredModuleStatus,
} from './plan';
import { SECTIONS, SECTION_IDS, isSectionId, type SectionId } from './sections';

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  fieldChars: 20_000,
  shortChars: 500,
  recordsPerSection: 5_000,
  checklistItems: 5_000,
  messages: 500,
  activity: 30,
} as const;

export interface NormalizeResult {
  plan: Plan;
  warnings: string[];
}

type Obj = Record<string, unknown>;

export function isPlainObject(v: unknown): v is Obj {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function own(o: Obj, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(o, key) ? o[key] : undefined;
}

/** Groups repeated warnings so a broken file does not produce thousands of lines. */
class Collector {
  private entries = new Map<string, { message: string; count: number }>();
  add(key: string, message: string) {
    const e = this.entries.get(key);
    if (e) e.count++;
    else this.entries.set(key, { message: message.replace(/^\[[^\]]+\]\s*/, ''), count: 1 });
  }
  finish(): string[] {
    return [...this.entries.values()].map((e) => (e.count > 1 ? `${e.message} (${e.count} times)` : e.message));
  }
}

function str(v: unknown, max: number, c: Collector, where: string): string {
  if (v === undefined || v === null) return '';
  let s: string;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
  else {
    c.add('nonstring', `[nonstring] A value in ${where} was not text and was left out.`);
    return '';
  }
  // Strip control characters other than tab and newline.
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (s.length > max) {
    c.add('truncated', `[truncated] Some very long text in ${where} was shortened to ${max.toLocaleString()} characters.`);
    s = s.slice(0, max);
  }
  return s;
}

function dateStr(v: unknown, c: Collector, where: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (isValidDateString(s)) return s;
  c.add('baddate', `[baddate] An invalid date in ${where} was cleared.`);
  return '';
}

function isoStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && isValidIsoTime(v) ? v : fallback;
}

function bool(v: unknown): boolean {
  return v === true;
}

function arr(v: unknown, c: Collector, where: string): unknown[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v;
  c.add('notarray', `[notarray] ${where} was not a list and was ignored.`);
  return [];
}

class IdRegistry {
  private seen = new Set<string>();
  take(v: unknown, c: Collector, where: string): string {
    if (typeof v === 'string' && SAFE_ID.test(v) && !this.seen.has(v)) {
      this.seen.add(v);
      return v;
    }
    if (typeof v === 'string' && this.seen.has(v)) c.add('dupid', `[dupid] A duplicate record ID in ${where} was replaced.`);
    else if (v !== undefined) c.add('badid', `[badid] A missing or unsafe record ID in ${where} was replaced.`);
    let id = newId();
    while (this.seen.has(id)) id = newId();
    this.seen.add(id);
    return id;
  }
}

function normalizeRecord(section: SectionId, raw: unknown, ids: IdRegistry, c: Collector): RecordItem | null {
  const def = SECTIONS[section];
  if (!isPlainObject(raw)) {
    c.add('badrecord', `[badrecord] An unreadable entry in ${def.title} was skipped.`);
    return null;
  }
  const rec: RecordItem = { id: ids.take(own(raw, 'id'), c, def.title) };
  const known = new Set(['id', ...def.fields.map((f) => f.key)]);
  for (const f of def.fields) {
    const v = own(raw, f.key);
    rec[f.key] = f.type === 'date' ? dateStr(v, c, def.title) : str(v, LIMITS.fieldChars, c, def.title);
  }
  const unknown = Object.keys(raw).filter((k) => !known.has(k));
  if (unknown.length) c.add(`unknown-${section}`, `[unknown-${section}] Unrecognized fields in ${def.title} were ignored.`);
  return rec;
}

function normalizeChecklistItem(raw: unknown, ids: IdRegistry, c: Collector): ChecklistItem | null {
  if (!isPlainObject(raw)) {
    c.add('badcheck', '[badcheck] An unreadable checklist item was skipped.');
    return null;
  }
  const title = str(own(raw, 'title'), LIMITS.shortChars, c, 'the checklist');
  return {
    id: ids.take(own(raw, 'id'), c, 'the checklist'),
    group: str(own(raw, 'group'), 120, c, 'the checklist') || 'Other',
    title: title || 'Untitled task',
    note: str(own(raw, 'note'), LIMITS.fieldChars, c, 'the checklist'),
    due: dateStr(own(raw, 'due'), c, 'the checklist'),
    done: bool(own(raw, 'done')),
  };
}

function normalizeMessage(raw: unknown, ids: IdRegistry, c: Collector): Message | null {
  if (!isPlainObject(raw)) {
    c.add('badmsg', '[badmsg] An unreadable personal message was skipped.');
    return null;
  }
  return {
    id: ids.take(own(raw, 'id'), c, 'personal messages'),
    audience: str(own(raw, 'audience'), LIMITS.shortChars, c, 'personal messages'),
    title: str(own(raw, 'title'), LIMITS.shortChars, c, 'personal messages'),
    body: str(own(raw, 'body'), LIMITS.fieldChars * 5, c, 'personal messages'),
  };
}

function capped<T>(items: T[], max: number, c: Collector, where: string): T[] {
  if (items.length <= max) return items;
  c.add(`cap-${where}`, `[cap-${where}] Only the first ${max.toLocaleString()} entries in ${where} were kept.`);
  return items.slice(0, max);
}

/**
 * Normalize a v2-shaped object into a valid Plan. Never throws for bad input;
 * problems become warnings. Callers decide whether the input was usable at all.
 */
export function normalizePlan(input: unknown, now: Date = new Date()): NormalizeResult {
  const c = new Collector();
  const base = blankPlan(now);
  const raw: Obj = isPlainObject(input) ? input : {};
  const ids = new IdRegistry();

  const meta = isPlainObject(own(raw, 'info')) ? (own(raw, 'info') as Obj) : {};
  const prefs = isPlainObject(own(raw, 'preferences')) ? (own(raw, 'preferences') as Obj) : {};
  const sh = isPlainObject(own(raw, 'startHere')) ? (own(raw, 'startHere') as Obj) : {};

  const plan: Plan = {
    schema: SCHEMA_ID,
    schemaVersion: SCHEMA_VERSION,
    info: {
      planName: str(own(meta, 'planName'), LIMITS.shortChars, c, 'plan details'),
      region: str(own(meta, 'region'), LIMITS.shortChars, c, 'plan details'),
      trustedContact: str(own(meta, 'trustedContact'), LIMITS.shortChars, c, 'plan details'),
      createdAt: isoStr(own(meta, 'createdAt'), base.info.createdAt),
      updatedAt: isoStr(own(meta, 'updatedAt'), base.info.updatedAt),
      lastReviewedAt: dateStr(own(meta, 'lastReviewedAt'), c, 'plan details'),
      lastExportedAt: isoStr(own(meta, 'lastExportedAt'), ''),
      isSample: bool(own(meta, 'isSample')),
    },
    preferences: {
      privacyDefault: bool(own(prefs, 'privacyDefault')),
      includePrivateInPrint: bool(own(prefs, 'includePrivateInPrint')),
    },
    startHere: {
      mode: own(sh, 'mode') === 'custom' ? 'custom' : 'default',
      customText: str(own(sh, 'customText'), LIMITS.fieldChars * 5, c, 'Start Here'),
    },
    messages: [],
    records: emptyRecords(),
    checklist: [],
    modules: {},
    assessment: { areas: {}, risks: [], completedAt: '' },
    audit: { dismissed: [], deferred: {} },
    activity: [],
  };

  const records = isPlainObject(own(raw, 'records')) ? (own(raw, 'records') as Obj) : {};
  for (const s of SECTION_IDS) {
    const list = arr(own(records, s), c, SECTIONS[s].title);
    plan.records[s] = capped(
      list.map((r) => normalizeRecord(s, r, ids, c)).filter((r): r is RecordItem => r !== null),
      LIMITS.recordsPerSection, c, SECTIONS[s].title,
    );
  }

  const checklistRaw = own(raw, 'checklist');
  plan.checklist = checklistRaw === undefined
    ? base.checklist
    : capped(arr(checklistRaw, c, 'The checklist').map((x) => normalizeChecklistItem(x, ids, c)).filter((x): x is ChecklistItem => x !== null), LIMITS.checklistItems, c, 'the checklist');

  plan.messages = capped(
    arr(own(raw, 'messages'), c, 'Personal messages').map((m) => normalizeMessage(m, ids, c)).filter((m): m is Message => m !== null),
    LIMITS.messages, c, 'personal messages',
  );

  const modules = own(raw, 'modules');
  if (isPlainObject(modules)) {
    for (const k of Object.keys(modules)) {
      const v = modules[k];
      if (isSectionId(k) && (STORED_MODULE_STATUSES as readonly unknown[]).includes(v) && v !== 'auto') {
        plan.modules[k] = v as StoredModuleStatus;
      }
    }
  }

  const assessment = own(raw, 'assessment');
  if (isPlainObject(assessment)) {
    const areas = own(assessment, 'areas');
    if (isPlainObject(areas)) {
      for (const k of Object.keys(areas)) {
        const v = areas[k];
        if (isAreaId(k) && (AREA_HANDLERS as readonly unknown[]).includes(v) && v !== '') plan.assessment.areas[k] = v as AreaHandler;
      }
    }
    const risks = own(assessment, 'risks');
    if (Array.isArray(risks)) plan.assessment.risks = [...new Set(risks.filter(isRiskId))];
    plan.assessment.completedAt = isoStr(own(assessment, 'completedAt'), '');
  }

  const audit = own(raw, 'audit');
  if (isPlainObject(audit)) {
    const FINDING_ID = /^[a-z0-9-]+(:[A-Za-z0-9_-]+)?$/;
    const dismissed = own(audit, 'dismissed');
    if (Array.isArray(dismissed)) plan.audit.dismissed = [...new Set(dismissed.filter((d): d is string => typeof d === 'string' && d.length <= 150 && FINDING_ID.test(d)))].slice(0, 2000);
    const deferred = own(audit, 'deferred');
    if (isPlainObject(deferred)) {
      for (const k of Object.keys(deferred).slice(0, 2000)) {
        const v = deferred[k];
        if (k.length <= 150 && FINDING_ID.test(k) && typeof v === 'string' && isValidDateString(v)) plan.audit.deferred[k] = v;
      }
    }
  }

  const activity = own(raw, 'activity');
  if (Array.isArray(activity)) {
    plan.activity = activity
      .filter(isPlainObject)
      .slice(0, LIMITS.activity)
      .map((a) => ({
        id: typeof a.id === 'string' && SAFE_ID.test(a.id) ? a.id : newId(),
        text: str(own(a, 'text'), 200, c, 'the activity log'),
        at: isoStr(own(a, 'at'), ''),
      }));
  }

  return { plan, warnings: c.finish() };
}
