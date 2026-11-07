/**
 * Turns the continuity assessment into a short, tiered list of sections to
 * work on. Deterministic: same answers, same recommendations.
 */
import { RISK_LABELS, type Plan } from './plan';
import { AREA_LABELS, SECTIONS, SECTION_IDS, type AreaId, type SectionId } from './sections';
import { RISK_TO_AREA } from './audit';
import { moduleStatus } from './readiness';

export const AREA_TO_SECTIONS: Record<AreaId, SectionId[]> = {
  finances: ['responsibilities', 'accounts', 'contacts'],
  household: ['responsibilities', 'home', 'notes'],
  technology: ['responsibilities', 'accounts', 'notes'],
  maintenance: ['home', 'contacts', 'responsibilities'],
  vehicles: ['responsibilities', 'home', 'documents'],
  taxes: ['responsibilities', 'contacts', 'documents'],
  insurance: ['accounts', 'documents', 'contacts'],
  children: ['people', 'responsibilities', 'health'],
  pets: ['responsibilities', 'contacts'],
  healthcare: ['health', 'contacts', 'people'],
  coordination: ['people', 'contacts', 'plans'],
  work: ['responsibilities', 'contacts', 'documents'],
  records: ['documents'],
  digital: ['accounts', 'responsibilities', 'notes'],
};

/** Sections that matter for almost everyone, before any answers. */
const BASE_SCORE: Partial<Record<SectionId, number>> = { contacts: 3, responsibilities: 2, plans: 2 };
const HANDLER_SCORE = { 'mostly-me': 3, shared: 1, 'someone-else': 0, 'not-applicable': 0, '': 0 } as const;
const RISK_SCORE = 2;

export interface Recommendation {
  section: SectionId;
  title: string;
  score: number;
  reasons: string[];
}

export interface Recommendations {
  priority: Recommendation[];
  helpful: Recommendation[];
  optional: Recommendation[];
  notApplicable: SectionId[];
  /** Areas the family depends on the creator for. */
  dependsOnYou: AreaId[];
}

export function recommend(plan: Plan): Recommendations {
  const score = new Map<SectionId, number>(SECTION_IDS.map((s) => [s, BASE_SCORE[s] ?? 0]));
  const reasons = new Map<SectionId, string[]>(SECTION_IDS.map((s) => [s, []]));
  const add = (s: SectionId, n: number, why: string) => {
    if (n <= 0) return;
    score.set(s, (score.get(s) ?? 0) + n);
    const r = reasons.get(s)!;
    if (!r.includes(why)) r.push(why);
  };
  // The first section listed for an area is its primary home and gets the full score;
  // the others get one point less.
  for (const [area, handler] of Object.entries(plan.assessment.areas) as [AreaId, keyof typeof HANDLER_SCORE][]) {
    const why = handler === 'mostly-me' ? `You mostly handle ${AREA_LABELS[area].toLowerCase()}` : `You share ${AREA_LABELS[area].toLowerCase()}`;
    AREA_TO_SECTIONS[area].forEach((s, i) => add(s, HANDLER_SCORE[handler] - (i === 0 ? 0 : 1), why));
  }
  for (const risk of plan.assessment.risks) {
    const area = RISK_TO_AREA[risk];
    if (plan.assessment.areas[area] === 'not-applicable') continue;
    AREA_TO_SECTIONS[area].forEach((s, i) => add(s, RISK_SCORE - (i === 0 ? 0 : 1), `${RISK_LABELS[risk]} would stop working`));
  }
  for (const s of Object.keys(BASE_SCORE) as SectionId[]) reasons.get(s)!.push('Useful in almost every plan');

  const notApplicable = SECTION_IDS.filter((s) => moduleStatus(plan, s) === 'not-applicable');
  const ranked = SECTION_IDS.filter((s) => !notApplicable.includes(s))
    .map((s) => ({ section: s, title: SECTIONS[s].title, score: score.get(s)!, reasons: reasons.get(s)!.slice(0, 3) }))
    .sort((a, b) => b.score - a.score || SECTION_IDS.indexOf(a.section) - SECTION_IDS.indexOf(b.section));

  const priority = ranked.filter((r) => r.score >= 3).slice(0, 4);
  const rest = ranked.filter((r) => !priority.includes(r));
  const helpful = rest.filter((r) => r.score >= 1).slice(0, 4);
  const optional = rest.filter((r) => !helpful.includes(r));
  const dependsOnYou = (Object.entries(plan.assessment.areas) as [AreaId, string][]).filter(([, h]) => h === 'mostly-me').map(([a]) => a);
  return { priority, helpful, optional, notApplicable, dependsOnYou };
}
