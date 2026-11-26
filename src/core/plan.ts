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

/**
 * The default Start Here note: short practical guidance in a neutral voice, shown until the creator
 * writes their own. It must not pretend to be the creator's personal words. Point to parts of the
 * plan by what they are ("what to do first", "who to call", "trusted contacts"), not by a page
 * name, because print, reader view and navigation label them differently.
 */
export const DEFAULT_START_HERE = `This plan was written for you, so you would not have to work everything out alone. If you are reading it, the person who wrote it has died, or cannot be here to help right now. It is OK to grieve, and to take your time.

Very little here is urgent. Start with what comes right after this page: what to do first, and who to call. Take the rest one step at a time, when you have the energy.

The people listed as trusted contacts were chosen because they can help. Let them. You do not have to do this by yourself.

This plan is guidance, not a legal document. If there is a will or other legal paperwork, it comes first. If something is unclear, ask a trusted contact or a professional.

You only need to do the next thing.`;

/**
 * An example last message, shown in the Start Here editor for inspiration only. It is never saved
 * into a plan or shown to the reader, because a generic letter presented as the creator's own
 * words rings false.
 */
export const EXAMPLE_START_HERE_LETTER = `To the people I love,

If you are reading this, I have died, or I can no longer be here to help. I am so sorry to leave you with this. I know it is hard, and I wish I could be with you for it.

Before anything practical: I love you. Thank you for the life we shared, for your patience with me, and for all the ordinary days. They were the best part.

If I hurt you, I am sorry. If you are carrying guilt about anything between us, please set it down. I let it go long ago, and I hope you can forgive me too.

Grieve in whatever way you need, for as long as you need. There is no right way to do it. And when you are ready, keep living. Laugh, make plans, let good things in. That is what I want for you.

Now the practical part. I wrote this plan so you would not have to figure everything out alone. Very little here is urgent. Start with what comes right after this note: what to do first, and who to call. Take the rest one step at a time, when you have the energy.

I chose the people listed as trusted contacts because they can help. Let them. You do not have to do this by yourself.

This plan is guidance, not a legal document. If there is a will or other legal paperwork, it comes first. If something is unclear, ask a trusted contact or a professional.

You only need to do the next thing.

With all my love.`;

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
