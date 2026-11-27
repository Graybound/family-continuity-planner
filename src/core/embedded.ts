/**
 * The saved plan file: the whole app as one HTML file with the plan inside.
 *
 * The plan travels as the normal backup JSON in a data block,
 *   <script type="application/json" id="when-im-gone-plan">...</script>
 * which browsers never run, so the Content Security Policy is unchanged.
 * See docs/specs/self-contained-plan-file.md.
 *
 * Everything here is pure (text in, text out) so it can be unit tested.
 * Once real plans exist, EMBED_ID and the escaping are a file format:
 * changing them needs code that still reads the old form.
 */
export const EMBED_ID = 'when-im-gone-plan';
/** The readable copy of the plan for previews that run no scripts. */
export const STATIC_ID = 'static-plan';

/** Saved plan files may be larger than a JSON backup by the size of the app itself. */
export const HTML_FILE_LIMIT_BYTES = 12 * 1024 * 1024;

/**
 * Make JSON text safe inside a <script> element. These are valid JSON escapes,
 * so JSON.parse returns the identical value. With no "<" left, nothing the
 * creator typed can close the element or open an HTML comment.
 */
export function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const OPEN_TAG = /<script\b[^>]*\bid\s*=\s*["']?when-im-gone-plan["']?[^>]*>/i;

/** True when the text looks like an HTML document rather than JSON. */
export function looksLikeHtml(text: string): boolean {
  return /^\uFEFF?\s*</.test(text);
}

/**
 * Return the backup JSON from a saved plan file, or null if the text has no
 * plan block. Safe to cut at the first "</script" because the writer escapes
 * every "<" inside the block.
 */
export function extractEmbeddedBackup(html: string): string | null {
  const open = OPEN_TAG.exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const end = html.toLowerCase().indexOf('</script', start);
  if (end < 0) return null;
  return html.slice(start, end);
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Longest name part of a file name, in characters. */
export const FILE_NAME_PART_MAX = 40;

/**
 * Turn a person's name into a file-name part: letters and digits in any
 * language are kept (José, Zoë), spaces and dashes become underscores, and
 * everything else is dropped, including the characters Windows or macOS refuse
 * (< > : " / \ | ? *) and apostrophes. Returns "" when nothing usable is left.
 */
export function fileNamePart(name: string): string {
  const cleaned = (name || '')
    .normalize('NFC')
    .replace(/[\s\-\u2010-\u2015]+/gu, '_')
    .replace(/[^\p{L}\p{M}\p{N}_]/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return Array.from(cleaned).slice(0, FILE_NAME_PART_MAX).join('').replace(/_+$/, '');
}

/**
 * File name stem for a save, in local time, always with seconds:
 * WhenImGone_Noah_Grayhek_2026-11-26_1432_05, or WhenImGone_2026-11-26_1432_05
 * when there is no name. Every name has the same shape, so plain, number-aware
 * (Windows Explorer, macOS Finder) and punctuation-blind sorting all put the
 * newest copy last (Noah's decision, 27 November 2026).
 */
export function savedFileStem(now: Date, ownerName?: string): string {
  const who = fileNamePart(ownerName ?? '');
  return `WhenImGone_${who ? `${who}_` : ''}${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
}

/** ISO 8601 time with the local offset, e.g. 2026-11-26T14:32:05-06:00, so the saved time reads the same everywhere. */
export function localIsoWithOffset(now: Date): string {
  const off = -now.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Crash-safety drafts. A saved plan file always opens on the plan inside it.
 * Edits made in it are kept in this browser as a draft keyed to the file's own
 * address, so two different files never share one. The draft is offered back
 * only on request; it never replaces what the file shows by itself.
 */
export const DRAFT_PREFIX = 'familyContinuityPlanner.draft.';

/** Storage key for a file's draft: the page address without query or fragment. */
export function draftKey(loc: { protocol: string; host: string; pathname: string }): string {
  return `${DRAFT_PREFIX}${loc.protocol}//${loc.host}${loc.pathname}`;
}

/** Fields stored next to the plan in a draft (the rest is a normal plan). */
export interface DraftMeta {
  /** The saved time of the file this draft started from (savedAt, or exportedAt for older files). */
  draftOf: string;
  /** File name of the last Export backup made from this draft, if any. */
  savedAs?: string;
  /** The plan's updatedAt when that file was made. */
  savedAsUpdatedAt?: string;
}

export function readDraftMeta(raw: unknown): DraftMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.draftOf !== 'string') return null;
  return {
    draftOf: o.draftOf,
    savedAs: typeof o.savedAs === 'string' ? o.savedAs.slice(0, 200) : undefined,
    savedAsUpdatedAt: typeof o.savedAsUpdatedAt === 'string' ? o.savedAsUpdatedAt : undefined,
  };
}

export type DraftCase =
  | 'none' // no draft, or nothing changed: show the file
  | 'stale' // a draft from a different file that was at this address before: ignore it
  | 'saved-elsewhere' // the changes were saved to a newer file: say which
  | 'unsaved'; // changes never saved to a file: offer them back

export function decideDraft(draft: { meta: DraftMeta; updatedAt: string } | null, file: { savedOn: string; updatedAt: string }): DraftCase {
  if (!draft) return 'none';
  if (draft.meta.draftOf !== file.savedOn) return 'stale';
  if (draft.meta.savedAs && draft.meta.savedAsUpdatedAt === draft.updatedAt) return 'saved-elsewhere';
  if (draft.updatedAt === file.updatedAt) return 'none';
  return 'unsaved';
}

/** Tells a reader with several copies which one to trust. */
export const NEWEST_COPY_LINE = 'If you have several copies, the one with the latest date in its name is the newest.';

/** "Alex Morgan's plan, saved Thursday, November 26, 2026 at 2:32 PM." or "This plan was saved ...". */
export function savedHeadline(ownerName: string, savedTime: string): string {
  const name = ownerName.trim();
  if (!savedTime) return name ? `${name}'s plan.` : '';
  return name ? `${name}'s plan, saved ${savedTime}.` : `This plan was saved ${savedTime}.`;
}
