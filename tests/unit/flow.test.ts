import { describe, expect, it } from 'vitest';
import { blankPlan } from '../../src/core/plan';
import { readiness, readinessRequirements, LEVEL_LABELS } from '../../src/core/readiness';
import { activeFindings, FINDING_TWINS, withoutTwins } from '../../src/core/audit';
import { AREA_HINTS, AREA_IDS, SECTION_IDS, type SectionId } from '../../src/core/sections';

const NOW = new Date('2026-11-07T12:00:00Z');
const TODAY = '2026-11-07';

describe('one order for the creator', () => {
  it('readiness asks for sections in the same order as the sidebar', () => {
    // The sidebar lists SECTION_IDS in order. If a requirement asked for a section further up the list
    // after one further down, the "Next" button would jump around the sidebar.
    const asked: SectionId[] = [];
    for (const r of readinessRequirements(blankPlan(NOW), TODAY)) {
      if (r.target.view === 'section' && !asked.includes(r.target.section)) asked.push(r.target.section);
    }
    const positions = asked.map((s) => SECTION_IDS.indexOf(s));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('the first sections in the sidebar are the ones the first level needs', () => {
    const basic = readinessRequirements(blankPlan(NOW), TODAY).filter((r) => r.level === 'basic' && r.target.view === 'section');
    expect(basic.map((r) => (r.target.view === 'section' ? r.target.section : ''))).toEqual(SECTION_IDS.slice(0, basic.length));
  });
});

describe('plain words', () => {
  it('level names avoid jargon', () => {
    for (const label of Object.values(LEVEL_LABELS)) expect(label).not.toMatch(/continuity|readiness|core|basic/i);
  });

  it('every area in the planning questions has an example line', () => {
    for (const a of AREA_IDS) expect(AREA_HINTS[a]?.trim()).toBeTruthy();
  });
});

describe('no duplicate asks on the overview', () => {
  it('a new plan is not asked for a trusted contact twice', () => {
    const plan = blankPlan(NOW);
    const rd = readiness(plan, TODAY);
    const all = activeFindings(plan, TODAY).active;
    expect(all.map((f) => f.rule)).toContain('no-contacts');
    expect(withoutTwins(all, rd.next.map((r) => r.id)).map((f) => f.rule)).not.toContain('no-contacts');
  });

  it('a finding stays when its twin requirement is not on screen', () => {
    const plan = blankPlan(NOW);
    const all = activeFindings(plan, TODAY).active;
    expect(withoutTwins(all, []).map((f) => f.rule)).toContain('no-contacts');
  });

  it('every twin names a real requirement', () => {
    const ids = new Set(readinessRequirements(blankPlan(NOW), TODAY).map((r) => r.id));
    for (const req of Object.values(FINDING_TWINS)) expect(ids.has(req)).toBe(true);
  });
});
