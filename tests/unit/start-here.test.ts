import { describe, expect, it } from 'vitest';
import { blankPlan, DEFAULT_START_HERE, startHereText } from '../../src/core/plan';

const paragraphs = DEFAULT_START_HERE.split(/\n\s*\n/).map((p) => p.trim());
const indexOf = (needle: string) => {
  const i = DEFAULT_START_HERE.indexOf(needle);
  if (i < 0) throw new Error(`Default Start Here text is missing: ${needle}`);
  return i;
};

describe('default Start Here text', () => {
  it('reads first as a last message to loved ones', () => {
    expect(paragraphs[0]).toBe('To the people I love,');
    expect(paragraphs.at(-1)).toBe('With all my love.');
    // The personal part comes before any practical guidance.
    const practical = indexOf('Now the practical part.');
    for (const phrase of ['I have died', 'I love you.', 'Thank you', 'I am sorry', 'Grieve', 'keep living']) {
      expect(indexOf(phrase)).toBeLessThan(practical);
    }
  });

  it('keeps the practical guidance after the message', () => {
    const practical = indexOf('Now the practical part.');
    for (const phrase of ['Very little here is urgent.', 'what to do first, and who to call', 'trusted contacts', 'not a legal document', 'will or other legal paperwork']) {
      expect(indexOf(phrase)).toBeGreaterThan(practical);
    }
  });

  it('points to parts of the plan by what they are, not by a page name that differs between views', () => {
    // "Immediate actions" is only a print heading; the app and reader view call it something else.
    expect(DEFAULT_START_HERE).not.toMatch(/Immediate actions|Emergency plans|Do this first|What to do, and when/);
  });

  it('follows the writing rules: no dashes, no euphemisms for death, short paragraphs', () => {
    expect(DEFAULT_START_HERE).not.toMatch(/[‒-―]/);
    expect(DEFAULT_START_HERE).not.toMatch(/passed away|passed on|no longer with you|something has changed/i);
    for (const p of paragraphs) expect(p.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(6);
  });

  it('is used for new plans and when a custom note is blank', () => {
    const plan = blankPlan(new Date('2026-11-26T12:00:00Z'));
    expect(startHereText(plan)).toBe(DEFAULT_START_HERE);
    plan.startHere = { mode: 'custom', customText: '  \n ' };
    expect(startHereText(plan)).toBe(DEFAULT_START_HERE);
    plan.startHere = { mode: 'custom', customText: 'Dear Sam,\n\nCall Pat first.' };
    expect(startHereText(plan)).toBe('Dear Sam,\n\nCall Pat first.');
  });
});
