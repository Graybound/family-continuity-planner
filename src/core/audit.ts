/**
 * Continuity audit: deterministic, explainable suggestions about likely gaps.
 *
 * Every finding states why it appeared. Findings can be dismissed (hidden for
 * good) or deferred (hidden until a date). No rule claims the plan is complete.
 * Rules are documented in docs/readiness-and-audit.md.
 */
import { addDays, daysBetween, todayString } from './dates';
import { RISK_LABELS, type Plan, type RiskId } from './plan';
import { AREA_LABELS, SECTIONS, SECTION_IDS, recordTitle, type AreaId } from './sections';
import { moduleStatus, type Target } from './readiness';

export interface Finding {
  id: string;
  rule: string;
  title: string;
  why: string;
  target: Target;
}

export const RISK_TO_AREA: Record<RiskId, AreaId> = {
  bills: 'finances',
  autopay: 'finances',
  taxes: 'taxes',
  investments: 'finances',
  insurance: 'insurance',
  access: 'technology',
  internet: 'technology',
  photos: 'digital',
  maintenance: 'maintenance',
  seasonal: 'maintenance',
  vehicles: 'vehicles',
  children: 'children',
  pets: 'pets',
  healthcare: 'healthcare',
  business: 'work',
};

/**
 * Kinds of secret the plan should not hold. The plan stores pointers (where a secret is kept and
 * who can get it), never the secret itself, because plans, backups and printouts are not encrypted.
 */
export type SecretKind = 'password' | 'recovery-code' | 'card-number' | 'account-number' | 'id-number';

/**
 * Words that start a pointer rather than a value: "Password: in the password manager",
 * "PIN is kept in the safe", or a hint such as "the dog's name". privacy-scan: allow
 */
const POINTER = String.raw`(?!(?:in|on|at|see|ask|stored|kept|saved|located|written|held|via|under|the|my|our|with|not|same)\b)`;
/** A password, PIN or similar, labelled and followed by a value, with a colon, equals sign or "is". */
const PASSWORD_LABEL = new RegExp(String.raw`\b(?:password|passcode|passwd|pwd|passphrase|pin(?: code)?|security answer)\s*(?:[:=]|\bis\b)\s*${POINTER}\S+`, 'i');
/** A labelled recovery code, backup code, secret key or recovery phrase. */
const RECOVERY_LABEL = new RegExp(String.raw`\b(?:recovery|backup|secret|setup|seed)\s+(?:codes?|key|phrase|words)\s*(?:[:=]|\bis\b|\bare\b)\s*${POINTER}\S+`, 'i');
/** The shape of a 1Password Secret Key, which starts with A3 and has dash-separated groups. */
const ONEPASSWORD_SECRET_KEY = /\bA3(?:-[A-Z0-9]{5,6}){5,}\b/;
/** 13 to 19 digits, optionally grouped, which looks like a full card number. */
const CARD_LIKE = /\b\d(?:[ -]?\d){12,18}\b/;
/** "Account number: 12345678" and similar: a labelled run of eight or more digits. Last four digits are fine. */
const ACCOUNT_LABEL = /\b(?:account|acct)\s*(?:number|no\.?|num|#)?\s*(?:[:=#]|\bis\b)?\s*\d(?:[ -]?\d){7,}/i;
/** A US Social Security number written in its usual shape, or labelled. */
const SSN_LIKE = /\b\d{3}-\d{2}-\d{4}\b|\b(?:ssn|social security(?: number)?)\s*(?:[:=#]|\bis\b)?\s*\d{3}[ -]?\d{2}[ -]?\d{4}\b/i;

/** The first kind of secret the text seems to contain, or null. A guess: callers warn, never block. */
export function secretKind(text: string): SecretKind | null {
  if (PASSWORD_LABEL.test(text)) return 'password';
  if (RECOVERY_LABEL.test(text) || ONEPASSWORD_SECRET_KEY.test(text)) return 'recovery-code';
  if (CARD_LIKE.test(text)) return 'card-number';
  if (ACCOUNT_LABEL.test(text)) return 'account-number';
  if (SSN_LIKE.test(text)) return 'id-number';
  return null;
}

export function looksLikeSecret(text: string): boolean {
  return secretKind(text) !== null;
}

/** Plain words for each kind, used in warnings and suggestions. */
export const SECRET_KIND_LABELS: Record<SecretKind, string> = {
  password: 'a password or PIN',
  'recovery-code': 'a recovery code or secret key',
  'card-number': 'a full card number',
  'account-number': 'a full account number',
  'id-number': 'a Social Security number',
};

/** What to write instead, for each kind. */
export const SECRET_KIND_INSTEAD: Record<SecretKind, string> = {
  password: 'Write where it is kept instead, for example "In the password manager, under Bank".', // privacy-scan: allow
  'recovery-code': 'Write where the printed codes or kit are kept instead, for example "Recovery kit is in the fire safe".',
  'card-number': 'Write the last four digits instead.',
  'account-number': 'Write the last four digits instead.',
  'id-number': 'Write where the card or paperwork is kept instead.',
};

/** A gentle warning for text that may hold a secret, or null. Never blocks saving. */
export function secretWarning(text: string): string | null {
  const kind = secretKind(text);
  if (!kind) return null;
  return `This looks like ${SECRET_KIND_LABELS[kind]}. Your plan is not encrypted, so anyone who gets the file or a printout could read it. ${SECRET_KIND_INSTEAD[kind]} You can still save it.`;
}

const BACKUP_STALE_DAYS = 90;
const PLAN_STALE_DAYS = 365;
export const DEFER_DAYS = 30;

export function allFindings(plan: Plan, today: string = todayString()): Finding[] {
  const out: Finding[] = [];
  const recs = plan.records;
  const hasContent = SECTION_IDS.some((s) => recs[s].length > 0);

  // 1. Areas that depend on the creator, or that would stop working, without a written description.
  const areaReasons = new Map<AreaId, string[]>();
  for (const [area, handler] of Object.entries(plan.assessment.areas) as [AreaId, string][]) {
    if (handler === 'mostly-me') areaReasons.set(area, [`you said ${AREA_LABELS[area].toLowerCase()} is mostly handled by you`]);
  }
  for (const risk of plan.assessment.risks) {
    const area = RISK_TO_AREA[risk];
    if (plan.assessment.areas[area] === 'not-applicable') continue;
    const list = areaReasons.get(area) ?? [];
    list.push(`you said ${RISK_LABELS[risk].toLowerCase()} would stop working without you`);
    areaReasons.set(area, list);
  }
  for (const [area, reasons] of areaReasons) {
    const label = AREA_LABELS[area];
    const covered = recs.responsibilities.some((r) => r.domain === label);
    if (covered) continue;
    out.push({
      id: `area-undocumented:${area}`,
      rule: 'area-undocumented',
      title: `${label}: how it works is not written down yet`,
      why: `In the continuity assessment ${reasons.join(', and ')}. Nothing in "Who handles what" covers this area yet.`,
      target: { view: 'section', section: 'responsibilities', prefill: { domain: label } },
    });
  }

  // 2. Nobody to call.
  if (recs.contacts.length === 0 && !plan.info.trustedContact.trim()) {
    out.push({
      id: 'no-contacts', rule: 'no-contacts', title: 'No trusted contacts yet',
      why: 'A reader will usually need someone to call first. The plan does not name anyone.',
      target: { view: 'section', section: 'contacts' },
    });
  }

  // 3. Accounts without access guidance.
  for (const r of recs.accounts) {
    if (!r.access?.trim()) {
      out.push({
        id: `account-no-access:${r.id}`, rule: 'account-no-access',
        title: `${recordTitle('accounts', r)}: no access guidance`,
        why: 'This account does not say where access instructions are stored or who can help get in.',
        target: { view: 'section', section: 'accounts' },
      });
    }
  }

  // 4. Documents past their review or expiration date.
  for (const r of recs.documents) {
    if (r.expires && daysBetween(r.expires, today) > 0) {
      out.push({
        id: `document-expired:${r.id}`, rule: 'document-expired',
        title: `${recordTitle('documents', r)}: review date has passed`,
        why: `The expiration or review date you recorded (${r.expires}) is in the past.`,
        target: { view: 'section', section: 'documents' },
      });
    }
  }

  // 5. Emergency plans not reviewed in over a year.
  for (const r of recs.plans) {
    if (r.reviewed && daysBetween(r.reviewed, today) > PLAN_STALE_DAYS) {
      out.push({
        id: `plan-stale:${r.id}`, rule: 'plan-stale',
        title: `${recordTitle('plans', r)}: last reviewed over a year ago`,
        why: `It was last reviewed on ${r.reviewed}. People, phone numbers, and places change.`,
        target: { view: 'section', section: 'plans' },
      });
    }
  }

  // 6. Overdue checklist items.
  for (const c of plan.checklist) {
    if (!c.done && c.due && daysBetween(c.due, today) > 0) {
      out.push({
        id: `checklist-overdue:${c.id}`, rule: 'checklist-overdue',
        title: `Checklist: "${c.title}" is past its due date`,
        why: `It was due on ${c.due} and is not checked off.`,
        target: { view: 'checklist' },
      });
    }
  }

  // 7. Text that looks like a password or full card number.
  for (const s of SECTION_IDS) {
    for (const r of recs[s]) {
      const text = Object.entries(r).filter(([k]) => k !== 'id').map(([, v]) => v).join('\n');
      const kind = secretKind(text);
      if (kind) {
        out.push({
          id: `possible-secret:${r.id}`, rule: 'possible-secret',
          title: `${recordTitle(s, r)}: may contain ${SECRET_KIND_LABELS[kind]}`,
          why: `Plans and backups are not encrypted. ${SECRET_KIND_INSTEAD[kind]}`,
          target: { view: 'section', section: s },
        });
      }
    }
  }

  // 8. Sections set aside for later.
  for (const s of SECTION_IDS) {
    if (moduleStatus(plan, s) === 'review-later') {
      out.push({
        id: `review-later:${s}`, rule: 'review-later', title: `${SECTIONS[s].title} is marked "Review later"`,
        why: 'You set this section aside. Come back to it when you have a few minutes.',
        target: { view: 'section', section: s },
      });
    }
  }

  // 9. Backup and review freshness, only once there is something worth protecting.
  if (hasContent) {
    const exported = plan.info.lastExportedAt.slice(0, 10);
    if (!plan.info.lastExportedAt) {
      out.push({ id: 'backup-never', rule: 'backup-never', title: 'No backup has been exported', why: 'Your plan exists only in this browser. Clearing browser data or losing this device would lose it.', target: { view: 'settings' } });
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(exported) && daysBetween(exported, today) > BACKUP_STALE_DAYS) {
      out.push({ id: 'backup-old', rule: 'backup-old', title: `Last backup is over ${BACKUP_STALE_DAYS} days old`, why: `The most recent export was on ${exported}. Recent changes are not protected.`, target: { view: 'settings' } });
    }
    const reviewed = plan.info.lastReviewedAt;
    if (!reviewed || daysBetween(reviewed, today) > PLAN_STALE_DAYS) {
      out.push({ id: 'plan-not-reviewed', rule: 'plan-not-reviewed', title: 'The plan has not been marked as reviewed this year', why: reviewed ? `It was last marked reviewed on ${reviewed}.` : 'Reading the plan through once a year keeps it trustworthy.', target: { view: 'settings' } });
    }
  }

  return out;
}

export function activeFindings(plan: Plan, today: string = todayString()): { active: Finding[]; hidden: number } {
  const all = allFindings(plan, today);
  const dismissed = new Set(plan.audit.dismissed);
  const active = all.filter((f) => {
    if (dismissed.has(f.id)) return false;
    const until = plan.audit.deferred[f.id];
    return !(until && daysBetween(today, until) > 0);
  });
  return { active, hidden: all.length - active.length };
}

export function deferUntil(today: string = todayString()): string {
  return addDays(today, DEFER_DAYS);
}
