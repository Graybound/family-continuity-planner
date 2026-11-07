/**
 * The versioned plan schema (schema version 2) and factory helpers.
 *
 * Every value inside a record is a string. That keeps validation simple and
 * means nothing in a plan is ever interpreted as code or markup.
 */
import { AREA_IDS, CHECKLIST_GROUPS, SECTION_IDS, type AreaId, type SectionId } from './sections';
import { newId } from './ids';

export const SCHEMA_ID = 'family-continuity-planner';
export const SCHEMA_VERSION = 2;

export type RecordItem = { id: string } & Record<string, string>;

export interface ChecklistItem {
  id: string;
  group: string;
  title: string;
  note: string;
  /** YYYY-MM-DD or empty. */
  due: string;
  done: boolean;
}

export interface Message {
  id: string;
  /** Who the message is for, in the creator's words, for example "My partner" or "Everyone". */
  audience: string;
  title: string;
  body: string;
}

/**
 * Stored module status. "auto" means the displayed status is derived from
 * whether the section has records (Not started or In progress).
 */
export type StoredModuleStatus = 'auto' | 'completed' | 'review-later' | 'not-applicable';
export const STORED_MODULE_STATUSES: readonly StoredModuleStatus[] = ['auto', 'completed', 'review-later', 'not-applicable'];

export type AreaHandler = '' | 'mostly-me' | 'shared' | 'someone-else' | 'not-applicable';
export const AREA_HANDLERS: readonly AreaHandler[] = ['', 'mostly-me', 'shared', 'someone-else', 'not-applicable'];

export const RISK_LABELS = {
  bills: 'Paying bills',
  autopay: 'Automatic payments',
  taxes: 'Taxes',
  investments: 'Savings and investments',
  insurance: 'Insurance',
  access: 'Access to important accounts and devices',
  internet: 'Internet and Wi-Fi',
  photos: 'Family photos and files',
  maintenance: 'Home maintenance',
  seasonal: 'Seasonal jobs',
  vehicles: 'Vehicle care',
  children: 'Children’s schedules',
  pets: 'Pet care',
  healthcare: 'Healthcare coordination',
  business: 'Work or business obligations',
} as const;
export type RiskId = keyof typeof RISK_LABELS;
export const RISK_IDS = Object.keys(RISK_LABELS) as RiskId[];

export interface Plan {
  schema: typeof SCHEMA_ID;
  schemaVersion: typeof SCHEMA_VERSION;
  /**
   * Plan details. Named "info", not "meta" as in v1, so the v1 app rejects v2
   * backups instead of half-loading them and silently dropping every record.
   */
  info: {
    planName: string;
    region: string;
    trustedContact: string;
    createdAt: string;
    updatedAt: string;
    /** YYYY-MM-DD the creator last confirmed the plan is current. */
    lastReviewedAt: string;
    /** ISO time of the last successful backup export. */
    lastExportedAt: string;
    /** True when the plan is the built-in fictional sample. */
    isSample: boolean;
  };
  preferences: {
    privacyDefault: boolean;
    includePrivateInPrint: boolean;
  };
  startHere: {
    mode: 'default' | 'custom';
    customText: string;
  };
  messages: Message[];
  records: Record<SectionId, RecordItem[]>;
  checklist: ChecklistItem[];
  modules: Partial<Record<SectionId, StoredModuleStatus>>;
  assessment: {
    areas: Partial<Record<AreaId, AreaHandler>>;
    risks: RiskId[];
    completedAt: string;
  };
  audit: {
    dismissed: string[];
    /** Finding id to YYYY-MM-DD it is snoozed until. */
    deferred: Record<string, string>;
  };
  activity: { id: string; text: string; at: string }[];
}

export const DEFAULT_START_HERE = `If you are reading this, something has changed and you may be carrying a lot right now. This plan was written to make the next days and weeks a little easier.

It collects the practical things that usually live in one person's head: who to call, how the household runs, where important papers are kept, and what can wait.

You do not need to handle everything at once. Very little here is urgent. Start with the "Immediate actions" section, then take the rest one step at a time.

The people and professionals listed under "Trusted contacts" were chosen because they can help. It is fine to lean on them.

This plan is guidance, not a legal document. A will, trust, or other legal papers take priority over anything written here. If something is unclear, ask one of the trusted contacts or a qualified professional.

Focus on the next necessary step. That is enough.`;

export function starterChecklist(): ChecklistItem[] {
  return [
    { id: newId(), group: CHECKLIST_GROUPS[0], title: 'Choose two trusted backup contacts', note: 'Confirm how they should be reached.', due: '', done: false },
    { id: newId(), group: CHECKLIST_GROUPS[1], title: 'Record utility shutoff locations', note: 'Include any tool needed to operate them.', due: '', done: false },
    { id: newId(), group: CHECKLIST_GROUPS[2], title: 'Walk one trusted person through the plan', note: 'Show them where the current backup is stored.', due: '', done: false },
    { id: newId(), group: CHECKLIST_GROUPS[3], title: 'Export an updated backup', note: 'Keep an offline copy somewhere protected.', due: '', done: false },
  ];
}

export function emptyRecords(): Record<SectionId, RecordItem[]> {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, []])) as unknown as Record<SectionId, RecordItem[]>;
}

export function blankPlan(now: Date = new Date()): Plan {
  const iso = now.toISOString();
  return {
    schema: SCHEMA_ID,
    schemaVersion: SCHEMA_VERSION,
    info: { planName: '', region: '', trustedContact: '', createdAt: iso, updatedAt: iso, lastReviewedAt: '', lastExportedAt: '', isSample: false },
    preferences: { privacyDefault: false, includePrivateInPrint: false },
    startHere: { mode: 'default', customText: '' },
    messages: [],
    records: emptyRecords(),
    checklist: starterChecklist(),
    modules: {},
    assessment: { areas: {}, risks: [], completedAt: '' },
    audit: { dismissed: [], deferred: {} },
    activity: [],
  };
}

export function startHereText(plan: Plan): string {
  return plan.startHere.mode === 'custom' && plan.startHere.customText.trim() ? plan.startHere.customText : DEFAULT_START_HERE;
}

export function isAreaId(v: unknown): v is AreaId {
  return typeof v === 'string' && (AREA_IDS as string[]).includes(v);
}

export function isRiskId(v: unknown): v is RiskId {
  return typeof v === 'string' && (RISK_IDS as string[]).includes(v);
}

/** True when nothing meaningful has been entered yet (starter checklist does not count). */
export function isEffectivelyEmpty(plan: Plan): boolean {
  const anyRecords = SECTION_IDS.some((s) => plan.records[s].length > 0);
  return !anyRecords && plan.messages.length === 0 && !plan.info.planName && !plan.info.trustedContact;
}
