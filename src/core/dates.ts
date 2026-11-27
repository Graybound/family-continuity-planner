/** Date helpers. Plan dates are stored as YYYY-MM-DD strings without time zones. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateString(v: string): boolean {
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidIsoTime(v: string): boolean {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

/** Format a YYYY-MM-DD date for display. Never throws; returns the raw text if it cannot be parsed. */
export function formatDate(v: string, locale?: string): string {
  if (!v) return '';
  if (!isValidDateString(v)) return v;
  const [y, m, d] = v.split('-').map(Number) as [number, number, number];
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return v;
  }
}

export function formatIsoTime(v: string, locale?: string): string {
  if (!v || !isValidIsoTime(v)) return '';
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v));
  } catch {
    return '';
  }
}

/** Date and time for display, e.g. "Thursday, November 26, 2026 at 2:32 PM" (wording depends on the browser's language). */
export function formatIsoDateTime(v: string, locale?: string): string {
  if (!v || !isValidIsoTime(v)) return '';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
  } catch {
    return '';
  }
}

/**
 * A saved time as the person who saved it saw it: "Thursday, November 26, 2026 at 2:32 PM".
 * Uses the wall-clock part of a local time with offset (savedAt), so the reader in
 * another time zone sees the same time as the file name. A UTC time ("Z", from older
 * files) is shown in the reader's own time zone instead.
 */
export function formatSavedTime(v: string, locale?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?[+-]\d{2}:\d{2}$/.exec(v);
  if (!m) return formatIsoDateTime(v, locale);
  const [y, mo, d, hh, mm] = m.slice(1, 6).map(Number) as [number, number, number, number, number];
  const wall = new Date(Date.UTC(y, mo - 1, d, hh, mm));
  if (Number.isNaN(wall.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(wall);
  } catch {
    return '';
  }
}

/** Today's date in local time as YYYY-MM-DD. */
export function todayString(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Whole days from a YYYY-MM-DD date until another (positive means b is later). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
