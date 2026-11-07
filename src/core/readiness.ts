/**
 * Module status and readiness levels.
 *
 * Readiness replaces the old percentage score. A level is reached only when
 * every requirement for that level and the levels below it is met. Each
 * requirement has a plain explanation so the UI can say exactly what is
 * missing. These rules are documented in docs/readiness-and-audit.md; keep
 * that file in sync when changing them.
 */
import { daysBetween, todayString } from './dates';
import type { Plan } from './plan';
import { SECTIONS, SECTION_IDS, type SectionId } from './sections';

export type ModuleStatus = 'not-started' | 'in-progress' | 'completed' | 'review-later' | 'not-applicable';

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
  'review-later': 'Review later',
  'not-applicable': 'Does not apply',
};

export function moduleStatus(plan: Plan, s: SectionId): ModuleStatus {
  const stored = plan.modules[s];
  if (stored && stored !== 'auto') return stored;
  return plan.records[s].length ? 'in-progress' : 'not-started';
}

/** A section is "addressed" when it has at least one record or the creator marked it completed or not applicable. */
export function isAddressed(plan: Plan, s: SectionId): boolean {
  const st = moduleStatus(plan, s);
  return plan.records[s].length > 0 || st === 'completed' || st === 'not-applicable';
}

export const LEVELS = ['getting-started', 'basic', 'core', 'thorough'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  'getting-started': 'Getting Started',
  basic: 'Basic Emergency Plan Ready',
  core: 'Core Continuity Plan Ready',
  thorough: 'Thorough Plan Ready',
};

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  'getting-started': 'Every plan starts here. A few small steps make it useful in an emergency.',
  basic: 'Someone reading this would know who to call, what to do first, and where key papers are.',
  core: 'The everyday knowledge your family relies on is written down, not just the emergencies.',
  thorough: 'Every area has been considered and the plan has been reviewed recently.',
};

export type Target = { view: 'section'; section: SectionId; prefill?: Record<string, string> } | { view: 'settings' | 'checklist' | 'start-here' | 'get-started' | 'review' };

export interface Requirement {
  id: string;
  level: Exclude<Level, 'getting-started'>;
  label: string;
  why: string;
  met: boolean;
  target: Target;
}

export interface Readiness {
  level: Level;
  label: string;
  description: string;
  requirements: Requirement[];
  /** Unmet requirements for the next level, in order. Empty at the top level. */
  next: Requirement[];
  nextLevel: Level | null;
}

const BACKUP_FRESH_DAYS = 90;
const REVIEW_FRESH_DAYS = 365;

function daysSinceIso(iso: string, today: string): number | null {
  if (!iso) return null;
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return daysBetween(d, today);
}

export function readinessRequirements(plan: Plan, today: string = todayString()): Requirement[] {
  const n = (s: SectionId) => plan.records[s].length;
  const addressed = (s: SectionId) => isAddressed(plan, s);
  const reqs: Requirement[] = [
    {
      id: 'basic-contact', level: 'basic', label: 'Name at least one trusted contact',
      why: 'The first thing a reader needs is someone they can call for help.',
      met: n('contacts') > 0 || !!plan.info.trustedContact.trim(), target: { view: 'section', section: 'contacts' },
    },
    {
      id: 'basic-emergency-plan', level: 'basic', label: 'Write one emergency plan',
      why: 'A short, ordered set of steps helps when clear thinking is hardest.',
      met: n('plans') > 0, target: { view: 'section', section: 'plans' },
    },
    {
      id: 'basic-documents', level: 'basic', label: 'Record where one important document is kept',
      why: 'Knowing where papers are saves hours of searching at a hard time.',
      met: n('documents') > 0, target: { view: 'section', section: 'documents' },
    },
    {
      id: 'basic-backup', level: 'basic', label: 'Export a backup',
      why: 'Your plan lives only in this browser until you export it.',
      met: !!plan.info.lastExportedAt, target: { view: 'settings' },
    },
    {
      id: 'core-responsibilities', level: 'core', label: 'Describe at least three things you handle',
      why: 'Everyday responsibilities are the knowledge families most often lose.',
      met: n('responsibilities') >= 3, target: { view: 'section', section: 'responsibilities' },
    },
    ...(['people', 'home', 'accounts', 'health'] as const).map((s): Requirement => ({
      id: `core-${s}`, level: 'core', label: `Address ${SECTIONS[s].title}`,
      why: 'Add at least one entry, or mark the section as completed or not applicable.',
      met: addressed(s), target: { view: 'section', section: s },
    })),
    {
      id: 'thorough-all-sections', level: 'thorough', label: 'Address every section',
      why: `Still open: ${SECTION_IDS.filter((s) => !addressed(s)).map((s) => SECTIONS[s].title).join(', ') || 'none'}.`,
      met: SECTION_IDS.every(addressed), target: { view: 'section', section: SECTION_IDS.find((s) => !addressed(s)) ?? 'responsibilities' },
    },
    {
      id: 'thorough-no-review-later', level: 'thorough', label: 'Resolve sections marked "Review later"',
      why: 'Sections you set aside for later still need a decision.',
      met: SECTION_IDS.every((s) => moduleStatus(plan, s) !== 'review-later'),
      target: { view: 'section', section: SECTION_IDS.find((s) => moduleStatus(plan, s) === 'review-later') ?? 'responsibilities' },
    },
    {
      id: 'thorough-reviewed', level: 'thorough', label: 'Confirm the plan is current (within the last year)',
      why: 'Plans drift as life changes. Mark the plan reviewed in Settings after you read it through.',
      met: (() => { const d = plan.info.lastReviewedAt ? daysBetween(plan.info.lastReviewedAt, today) : null; return d !== null && d <= REVIEW_FRESH_DAYS; })(),
      target: { view: 'settings' },
    },
    {
      id: 'thorough-backup-recent', level: 'thorough', label: `Export a backup within the last ${BACKUP_FRESH_DAYS} days`,
      why: 'A recent backup protects recent changes.',
      met: (() => { const d = daysSinceIso(plan.info.lastExportedAt, today); return d !== null && d <= BACKUP_FRESH_DAYS; })(),
      target: { view: 'settings' },
    },
  ];
  return reqs;
}

export function readiness(plan: Plan, today: string = todayString()): Readiness {
  const requirements = readinessRequirements(plan, today);
  let level: Level = 'getting-started';
  for (const l of ['basic', 'core', 'thorough'] as const) {
    if (requirements.filter((r) => r.level === l).every((r) => r.met)) level = l;
    else break;
  }
  const idx = LEVELS.indexOf(level);
  const nextLevel = idx < LEVELS.length - 1 ? LEVELS[idx + 1]! : null;
  return {
    level,
    label: LEVEL_LABELS[level],
    description: LEVEL_DESCRIPTIONS[level],
    requirements,
    next: nextLevel ? requirements.filter((r) => r.level === nextLevel && !r.met) : [],
    nextLevel,
  };
}
