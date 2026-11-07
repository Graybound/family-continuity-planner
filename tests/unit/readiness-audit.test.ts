import { describe, expect, it } from 'vitest';
import { blankPlan, type Plan } from '../../src/core/plan';
import { readiness, moduleStatus, isAddressed } from '../../src/core/readiness';
import { activeFindings, allFindings, looksLikeSecret } from '../../src/core/audit';
import { recommend } from '../../src/core/recommend';
import { samplePlan } from '../../src/core/sample';
import { search } from '../../src/core/search';

const NOW = new Date('2026-11-07T12:00:00Z');
const TODAY = '2026-11-07';
let n = 0;
const r = (fields: Record<string, string>) => ({ id: `t${n++}`, ...fields });

function basicPlan(): Plan {
  const p = blankPlan(NOW);
  p.records.contacts.push(r({ name: 'Pat' }));
  p.records.plans.push(r({ name: 'Outage', trigger: 'x', steps: 'y' }));
  p.records.documents.push(r({ name: 'Will', location: 'Safe' }));
  p.info.lastExportedAt = '2026-11-01T00:00:00.000Z';
  return p;
}

describe('module status', () => {
  it('derives Not started and In progress, and respects explicit statuses', () => {
    const p = blankPlan(NOW);
    expect(moduleStatus(p, 'people')).toBe('not-started');
    p.records.people.push(r({ name: 'A' }));
    expect(moduleStatus(p, 'people')).toBe('in-progress');
    p.modules.people = 'review-later';
    expect(moduleStatus(p, 'people')).toBe('review-later');
    p.modules.health = 'not-applicable';
    expect(isAddressed(p, 'health')).toBe(true);
  });
});

describe('readiness levels', () => {
  it('a new plan is Getting Started and lists what Basic needs', () => {
    const rd = readiness(blankPlan(NOW), TODAY);
    expect(rd.level).toBe('getting-started');
    expect(rd.nextLevel).toBe('basic');
    expect(rd.next.map((x) => x.id)).toEqual(['basic-contact', 'basic-emergency-plan', 'basic-documents', 'basic-backup']);
  });
  it('the starter checklist alone does not raise readiness (v1 counted it)', () => {
    const p = blankPlan(NOW);
    p.checklist.forEach((c) => (c.done = true));
    expect(readiness(p, TODAY).level).toBe('getting-started');
  });
  it('reaches Basic with a contact, plan, document location, and backup', () => {
    expect(readiness(basicPlan(), TODAY).level).toBe('basic');
    const p = basicPlan();
    p.info.lastExportedAt = '';
    expect(readiness(p, TODAY).level).toBe('getting-started');
  });
  it('a trusted contact in plan details counts as a contact', () => {
    const p = basicPlan();
    p.records.contacts = [];
    p.info.trustedContact = 'Pat';
    expect(readiness(p, TODAY).level).toBe('basic');
  });
  it('reaches Core with three responsibilities and the four core sections addressed', () => {
    const p = basicPlan();
    for (let i = 0; i < 3; i++) p.records.responsibilities.push(r({ name: `R${i}` }));
    p.records.people.push(r({ name: 'A' }));
    p.records.home.push(r({ name: 'Water' }));
    p.records.accounts.push(r({ name: 'Bank', access: 'PM' }));
    expect(readiness(p, TODAY).level).toBe('basic');
    p.modules.health = 'not-applicable';
    expect(readiness(p, TODAY).level).toBe('core');
  });
  it('reaches Thorough only with every section addressed, nothing deferred, and recent review and backup', () => {
    const p = basicPlan();
    for (let i = 0; i < 3; i++) p.records.responsibilities.push(r({ name: `R${i}` }));
    for (const s of ['people', 'home', 'accounts', 'health', 'notes'] as const) p.records[s].push(r({ name: s }));
    expect(readiness(p, TODAY).level).toBe('core');
    p.info.lastReviewedAt = '2026-10-01';
    expect(readiness(p, TODAY).level).toBe('thorough');
    p.modules.notes = 'review-later';
    expect(readiness(p, TODAY).level).toBe('core');
    p.modules.notes = 'completed';
    p.info.lastExportedAt = '2026-01-01T00:00:00Z';
    expect(readiness(p, TODAY).level).toBe('core');
  });
  it('levels are cumulative: Core requirements without Basic stay Getting Started', () => {
    const p = blankPlan(NOW);
    for (let i = 0; i < 3; i++) p.records.responsibilities.push(r({ name: `R${i}` }));
    for (const s of ['people', 'home', 'accounts', 'health'] as const) p.records[s].push(r({ name: s }));
    expect(readiness(p, TODAY).level).toBe('getting-started');
  });
});

describe('continuity audit', () => {
  it('flags areas the creator handles with no written description, explaining why', () => {
    const p = blankPlan(NOW);
    p.assessment.areas.taxes = 'mostly-me';
    p.assessment.risks = ['bills'];
    const ids = allFindings(p, TODAY).map((f) => f.id);
    expect(ids).toContain('area-undocumented:taxes');
    expect(ids).toContain('area-undocumented:finances');
    const f = allFindings(p, TODAY).find((x) => x.id === 'area-undocumented:taxes')!;
    expect(f.why).toMatch(/mostly handled by you/);
    expect(f.target).toEqual({ view: 'section', section: 'responsibilities', prefill: { domain: 'Taxes' } });
    p.records.responsibilities.push(r({ name: 'Taxes', domain: 'Taxes' }));
    expect(allFindings(p, TODAY).map((x) => x.id)).not.toContain('area-undocumented:taxes');
  });
  it('ignores risks in areas marked as not applicable', () => {
    const p = blankPlan(NOW);
    p.assessment.areas.pets = 'not-applicable';
    p.assessment.risks = ['pets'];
    expect(allFindings(p, TODAY).map((x) => x.id)).not.toContain('area-undocumented:pets');
  });
  it('finds stale, overdue, and risky entries', () => {
    const p = basicPlan();
    p.records.accounts.push(r({ name: 'Bank' }));
    p.records.documents.push(r({ name: 'Passport', location: 'Drawer', expires: '2026-01-01' }));
    p.records.plans.push(r({ name: 'Old', reviewed: '2024-01-01' }));
    p.checklist[0]!.due = '2026-10-01';
    p.records.notes.push(r({ name: 'Wifi', details: 'password: hunter2' })); // privacy-scan: allow (fake secret for the detector test)
    const rules = new Set(allFindings(p, TODAY).map((f) => f.rule));
    for (const rule of ['account-no-access', 'document-expired', 'plan-stale', 'checklist-overdue', 'possible-secret', 'plan-not-reviewed']) expect(rules).toContain(rule);
  });
  it('asks for a first backup only once there is content', () => {
    expect(allFindings(blankPlan(NOW), TODAY).map((f) => f.id)).not.toContain('backup-never');
    const p = blankPlan(NOW);
    p.records.people.push(r({ name: 'A' }));
    expect(allFindings(p, TODAY).map((f) => f.id)).toContain('backup-never');
  });
  it('supports dismissing and deferring findings', () => {
    const p = blankPlan(NOW);
    expect(activeFindings(p, TODAY).active.map((f) => f.id)).toContain('no-contacts');
    p.audit.deferred['no-contacts'] = '2026-12-01';
    expect(activeFindings(p, TODAY).active.map((f) => f.id)).not.toContain('no-contacts');
    expect(activeFindings(p, '2026-12-01').active.map((f) => f.id)).toContain('no-contacts');
    p.audit.dismissed.push('no-contacts');
    expect(activeFindings(p, '2027-01-01')).toMatchObject({ hidden: 1 });
  });
  it('detects likely secrets without flagging ordinary text', () => {
    expect(looksLikeSecret('PIN=1234')).toBe(true); // privacy-scan: allow
    expect(looksLikeSecret('card 4111 1111 1111 1111')).toBe(true);
    expect(looksLikeSecret('Password manager has emergency access')).toBe(false);
    expect(looksLikeSecret('Call 555-0100 after 5')).toBe(false);
    expect(looksLikeSecret('Checking ends 0000')).toBe(false);
  });
});

describe('recommendations', () => {
  it('recommends trusted contacts and responsibilities before any answers', () => {
    const rec = recommend(blankPlan(NOW));
    expect(rec.priority.map((x) => x.section)).toEqual(['contacts']);
    expect(rec.helpful.map((x) => x.section)).toEqual(['responsibilities', 'plans']);
  });
  it('raises sections tied to what the creator handles, with reasons, in at most four priority items', () => {
    const p = blankPlan(NOW);
    p.assessment.areas = { finances: 'mostly-me', taxes: 'mostly-me', healthcare: 'mostly-me' };
    p.assessment.risks = ['bills'];
    const rec = recommend(p);
    expect(rec.priority.length).toBeLessThanOrEqual(4);
    const resp = rec.priority.find((x) => x.section === 'responsibilities')!;
    expect(resp).toBeDefined();
    expect(resp.reasons.join(' ')).toMatch(/finances/i);
    expect(rec.priority.map((x) => x.section)).toContain('health');
    expect(rec.dependsOnYou).toEqual(['finances', 'taxes', 'healthcare']);
  });
  it('is deterministic and excludes sections marked not applicable', () => {
    const p = samplePlan(NOW);
    p.modules.notes = 'not-applicable';
    expect(recommend(p)).toEqual(recommend(p));
    const all = [...recommend(p).priority, ...recommend(p).helpful, ...recommend(p).optional].map((x) => x.section);
    expect(all).not.toContain('notes');
    expect(recommend(p).notApplicable).toEqual(['notes']);
  });
});

describe('search', () => {
  const p = samplePlan(NOW);
  it('matches every word, case-insensitively, across records, checklist, and messages', () => {
    expect(search(p, 'casey ACCOUNTANT', { includePrivate: true }).map((h) => h.title)).toContain('Casey Rivera, Example Tax Partners');
    expect(search(p, 'backup', { includePrivate: true }).some((h) => h.kind === 'checklist')).toBe(true);
    expect(search(p, 'lean on pat', { includePrivate: true }).some((h) => h.kind === 'message')).toBe(true);
  });
  it('does not search private fields when privacy mode is on', () => {
    expect(search(p, 'red handle', { includePrivate: true })).toHaveLength(1);
    expect(search(p, 'red handle', { includePrivate: false })).toHaveLength(0);
  });
});
