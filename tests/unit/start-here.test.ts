import { describe, expect, it } from 'vitest';
import { blankPlan, DEFAULT_START_HERE, EXAMPLE_START_HERE_LETTER, startHereText } from '../../src/core/plan';

const paragraphsOf = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim());
const position = (text: string, needle: string) => {
  const i = text.indexOf(needle);
  if (i < 0) throw new Error(`Text is missing: ${needle}`);
  return i;
};

// Page names differ between navigation, print and reader view, so neither text may use them.
const PAGE_NAMES = /Immediate actions|Emergency plans|Do this first|What to do, and when/;

describe('default Start Here text', () => {
  it('gives the practical guidance', () => {
    for (const phrase of ['has died', 'Very little here is urgent.', 'what to do first, and who to call', 'trusted contacts', 'not a legal document', 'will or other legal paperwork']) {
      position(DEFAULT_START_HERE, phrase);
    }
  });

  it('does not pretend to be the creator speaking', () => {
    // A generic letter shown as the creator's own words rings false; that is what the example is for.
    expect(DEFAULT_START_HERE).not.toMatch(/\bI\b|\bmy\b|\bme\b|I love/);
  });

  it('follows the writing rules', () => {
    for (const text of [DEFAULT_START_HERE, EXAMPLE_START_HERE_LETTER]) {
      expect(text).not.toMatch(PAGE_NAMES);
      expect(text).not.toMatch(/[‒-―]/);
      expect(text).not.toMatch(/passed away|passed on|no longer with you|something has changed/i);
      for (const p of paragraphsOf(text)) expect(p.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(6);
    }
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

describe('example Start Here letter', () => {
  const letter = EXAMPLE_START_HERE_LETTER;
  const paragraphs = paragraphsOf(letter);

  it('reads first as a last message, then the practical part', () => {
    expect(paragraphs[0]).toBe('To the people I love,');
    expect(paragraphs.at(-1)).toBe('With all my love.');
    const practical = position(letter, 'Now the practical part.');
    for (const phrase of ['I have died', 'I love you.', 'Thank you', 'I am sorry', 'Grieve', 'keep living']) {
      expect(position(letter, phrase)).toBeLessThan(practical);
    }
    for (const phrase of ['Very little here is urgent.', 'what to do first, and who to call', 'trusted contacts', 'not a legal document']) {
      expect(position(letter, phrase)).toBeGreaterThan(practical);
    }
  });

  it('is never what a reader sees', () => {
    const plan = blankPlan(new Date('2026-11-26T12:00:00Z'));
    expect(startHereText(plan)).not.toContain('To the people I love');
    expect(JSON.stringify(plan)).not.toContain('To the people I love');
  });
});
