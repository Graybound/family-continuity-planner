/**
 * Handing over access without storing secrets: the secret detector that warns in the
 * entry form, the handoff guidance content, and the "Practice the handoff" step.
 */
import { describe, expect, it } from 'vitest';
import { allFindings, looksLikeSecret, secretKind, secretWarning } from '../../src/core/audit';
import { HANDOFF_CHECKED_ON, HANDOFF_METHODS, PRACTICE_HANDOFF_ID, PRACTICE_HANDOFF_NOTE, PRACTICE_HANDOFF_TITLE, practiceHandoffItem, practiceStatus } from '../../src/core/handoff';
import { blankPlan } from '../../src/core/plan';
import { parseBackup, serializeBackup } from '../../src/core/backup';
import { samplePlan } from '../../src/core/sample';

const NOW = new Date('2026-11-26T12:00:00Z');

describe('secretKind', () => {
  it('recognizes the kinds of secret the plan should not hold', () => {
    expect(secretKind('The PIN is 4821')).toBe('password'); // privacy-scan: allow
    expect(secretKind('wifi passphrase: correcthorse')).toBe('password'); // privacy-scan: allow
    expect(secretKind('Recovery codes: 1234-5678 9876-5432')).toBe('recovery-code');
    expect(secretKind('Secret Key A3-ABCDEF-GHIJKL-MNOPQ-RSTUV-WXYZ1-23456')).toBe('recovery-code');
    expect(secretKind('Visa 4111 1111 1111 1111')).toBe('card-number');
    expect(secretKind('Account number: 12345678')).toBe('account-number');
    expect(secretKind('acct # 0012 3456 78')).toBe('account-number');
    expect(secretKind('SSN 123-45-6789')).toBe('id-number'); // privacy-scan: allow
  });

  it('does not flag pointers, hints, last four digits or ordinary numbers', () => {
    for (const ok of [
      'The password is in the password manager under "Bank"',
      'PIN is kept in the envelope in the safe',
      'Recovery codes are in the fire safe, top shelf',
      'Recovery key: see the printed kit',
      'Account ending 4821',
      'Checking ends 0000',
      'Account phone 555-0130',
      'Policy number on the insurance card in the glovebox',
      'Call 555-0100 after 5',
      'Password manager has emergency access',
      'This is the pin for the gate hinge',
    ]) expect(secretKind(ok), ok).toBeNull();
  });

  it('keeps looksLikeSecret in step with secretKind', () => {
    expect(looksLikeSecret('Account number: 12345678')).toBe(true);
    expect(looksLikeSecret('Account ending 4821')).toBe(false);
  });
});

describe('secretWarning', () => {
  it('names the kind, says the plan is not encrypted, suggests a pointer and never blocks', () => {
    const w = secretWarning('Password: hunter2')!; // privacy-scan: allow
    expect(w).toMatch(/password or PIN/);
    expect(w).toMatch(/not encrypted/);
    expect(w).toMatch(/Write where it is kept instead/);
    expect(w).toMatch(/You can still save it/);
    expect(secretWarning('Visa 4111 1111 1111 1111')).toMatch(/last four digits/);
    expect(secretWarning('In the password manager')).toBeNull();
  });
});

describe('continuity suggestion for likely secrets', () => {
  it('says which kind of secret it found', () => {
    const p = blankPlan(NOW);
    p.records.accounts.push({ id: 'a1', name: 'Bank', type: 'Banking', owner: '', identifier: 'Account number: 12345678', website: '', phone: '', access: '', notes: '' });
    const f = allFindings(p, '2026-11-26').find((x) => x.id === 'possible-secret:a1');
    expect(f?.title).toBe('Bank: may contain a full account number');
    expect(f?.why).toMatch(/last four digits/);
  });
});

describe('handoff methods', () => {
  it('ranks password manager emergency access first and the printed kit second', () => {
    expect(HANDOFF_METHODS.map((m) => m.id).slice(0, 2)).toEqual(['password-manager-emergency-access', 'printed-emergency-kit']);
  });
  it('has a check date and complete entries in plain punctuation', () => {
    expect(HANDOFF_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const all = [PRACTICE_HANDOFF_TITLE, PRACTICE_HANDOFF_NOTE];
    for (const m of HANDOFF_METHODS) {
      for (const v of [m.title, m.gives, m.limits, m.write]) expect(v.trim().length, m.id).toBeGreaterThan(0);
      all.push(m.title, m.gives, m.limits, m.write);
    }
    for (const v of all) expect(v).not.toMatch(/[\u2013\u2014]/);
  });
  it('never tells the creator to write a secret into the plan', () => {
    for (const m of HANDOFF_METHODS) expect(secretKind(m.write), m.id).toBeNull();
  });
});

describe('practice the handoff', () => {
  it('is on the starter checklist of a new plan', () => {
    const p = blankPlan(NOW);
    expect(p.checklist.some((c) => c.id === PRACTICE_HANDOFF_ID)).toBe(true);
    expect(practiceStatus(p.checklist)).toBe('planned');
  });
  it('reports not planned, planned and done', () => {
    expect(practiceStatus([])).toBe('not-planned');
    const item = practiceHandoffItem();
    expect(practiceStatus([item])).toBe('planned');
    expect(practiceStatus([{ ...item, done: true }])).toBe('done');
  });
  it('keeps its id and done state through a backup and restore', () => {
    const p = samplePlan(NOW);
    p.checklist = p.checklist.filter((c) => c.id !== PRACTICE_HANDOFF_ID);
    p.checklist.push({ ...practiceHandoffItem(), done: true });
    const r = parseBackup(serializeBackup(p, '0.0.0', NOW), { now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(practiceStatus(r.plan.checklist)).toBe('done');
  });
});
