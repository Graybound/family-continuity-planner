/**
 * Backup export and import.
 *
 * Import is a pure function: text in, validated plan plus a preview out.
 * Nothing touches application state until the user confirms in the UI.
 */
import { detectVersion, migrateToCurrent } from './migrate';
import { LIMITS, isPlainObject, normalizePlan } from './normalize';
import { SECTIONS, SECTION_IDS, type SectionId } from './sections';
import type { Plan } from './plan';
import { todayString } from './dates';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function safeJsonParse(text: string): { ok: true; value: unknown; removedKeys: number } | { ok: false } {
  let removedKeys = 0;
  try {
    const value: unknown = JSON.parse(text, (key, v: unknown) => {
      if (FORBIDDEN_KEYS.has(key)) {
        removedKeys++;
        return undefined;
      }
      return v;
    });
    return { ok: true, value, removedKeys };
  } catch {
    return { ok: false };
  }
}

export interface BackupPreview {
  sourceVersion: number;
  planName: string;
  createdAt: string;
  updatedAt: string;
  exportedAt: string;
  isSample: boolean;
  counts: { section: SectionId; title: string; count: number }[];
  totalRecords: number;
  checklistItems: number;
  messages: number;
  actions: string[];
  warnings: string[];
}

export type ParseResult = { ok: true; plan: Plan; preview: BackupPreview } | { ok: false; error: string };

export function parseBackup(text: string, opts: { lenient?: boolean; now?: Date } = {}): ParseResult {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' };
  if (text.length > LIMITS.fileBytes) return { ok: false, error: 'The file is larger than 10 MB, which is far bigger than any normal plan. It was not opened.' };
  const parsed = safeJsonParse(text.replace(/^\uFEFF/, ''));
  if (!parsed.ok) return { ok: false, error: 'The file could not be read as a backup. It may be damaged or not a JSON backup file.' };
  const detected = detectVersion(parsed.value, { lenient: opts.lenient });
  if (!detected.ok) return { ok: false, error: detected.error };
  let migrated: { raw: Record<string, unknown>; actions: string[] };
  try {
    migrated = migrateToCurrent(detected);
  } catch {
    return { ok: false, error: 'The backup could not be upgraded to the current format.' };
  }
  const { plan, warnings } = normalizePlan(migrated.raw, opts.now);
  if (parsed.removedKeys) warnings.unshift(`Removed ${parsed.removedKeys} unsafe field name${parsed.removedKeys === 1 ? '' : 's'} from the file.`);
  const counts = SECTION_IDS.map((s) => ({ section: s, title: SECTIONS[s].title, count: plan.records[s].length }));
  const raw = parsed.value as Record<string, unknown>;
  return {
    ok: true,
    plan,
    preview: {
      sourceVersion: detected.version,
      planName: plan.info.planName,
      createdAt: plan.info.createdAt,
      updatedAt: plan.info.updatedAt,
      exportedAt: isPlainObject(raw) && typeof raw.exportedAt === 'string' ? raw.exportedAt.slice(0, 40) : '',
      isSample: plan.info.isSample,
      counts,
      totalRecords: counts.reduce((n, c) => n + c.count, 0),
      checklistItems: plan.checklist.length,
      messages: plan.messages.length,
      actions: migrated.actions,
      warnings,
    },
  };
}

export function serializeBackup(plan: Plan, appVersion: string, now: Date = new Date()): string {
  const out = { ...plan, exportedAt: now.toISOString(), exportedBy: `Family Continuity Planner ${appVersion}` };
  return JSON.stringify(out, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  return `family-continuity-backup-${todayString(now)}.json`;
}
