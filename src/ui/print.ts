/**
 * Builds the family-facing printed packet. The packet is plain document
 * markup in #print-packet, shown only by print CSS.
 *
 * PACKET_ORDER lists the parts of the full packet. Audience-specific packets
 * (executor, caregiver, technology helper) are planned: they would pass a
 * different list of parts. They are not implemented yet.
 */
import { formatDate, todayString } from '../core/dates';
import { CHECKLIST_GROUPS, SECTIONS, recordTitle, type SectionId } from '../core/sections';
import { startHereText, type Plan } from '../core/plan';
import { clear, h, type Child } from './dom';

export type PacketPart = 'cover' | 'start-here' | 'immediate' | 'contacts' | SectionId | 'checklist' | 'messages';

export const PACKET_ORDER: PacketPart[] = ['cover', 'start-here', 'immediate', 'contacts', 'responsibilities', 'people', 'health', 'home', 'accounts', 'documents', 'notes', 'checklist', 'messages'];

export interface PacketOptions {
  includePrivate: boolean;
  parts?: PacketPart[];
  today?: string;
}

function paragraphs(text: string): HTMLElement {
  return h('div', { class: 'pk-text' }, text.split(/\n\s*\n/).map((para) => h('p', null, para.trim())));
}

function recordBlock(plan: Plan, s: SectionId, r: Record<string, string>, includePrivate: boolean, skip: string[] = []): HTMLElement {
  const def = SECTIONS[s];
  const rows: Child[] = [];
  for (const f of def.fields) {
    if (f.key === def.titleField || skip.includes(f.key)) continue;
    const v = r[f.key];
    if (!v) continue;
    let value: Child;
    if (f.private && !includePrivate) value = h('span', { class: 'pk-withheld' }, 'Withheld from this printout (private)');
    else if (f.type === 'date') value = formatDate(v);
    else if (s === 'plans' && f.key === 'steps') value = h('ol', { class: 'pk-steps' }, v.split('\n').filter((x) => x.trim()).map((x) => h('li', null, x.trim())));
    else value = v;
    rows.push(h('dt', null, f.label), h('dd', null, value));
  }
  return h('article', { class: 'pk-record' }, h('h3', null, recordTitle(s, r)), rows.length ? h('dl', null, rows) : null);
}

function checklistList(items: Plan['checklist']): HTMLElement {
  return h('ul', { class: 'pk-checks' }, items.map((c) => h('li', { class: c.done ? 'done' : undefined },
    h('span', null, c.title, c.done ? ' (done)' : ''),
    c.due ? h('small', null, `Due ${formatDate(c.due)}`) : null,
    c.note ? h('small', { class: 'multiline' }, c.note) : null,
  )));
}

export function buildPacket(plan: Plan, opts: PacketOptions): HTMLElement {
  const today = opts.today ?? todayString();
  const parts = opts.parts ?? PACKET_ORDER;
  const name = plan.info.planName || 'Family Continuity Plan';
  const out = h('div', null);
  const empty = (text: string) => h('p', { class: 'pk-empty' }, text);

  for (const part of parts) {
    if (part === 'cover') {
      out.append(h('section', { class: 'pk-cover' },
        h('h1', null, name),
        h('p', { class: 'pk-sub' }, 'Practical information for the people who may need to keep things running.'),
        h('dl', null,
          h('dt', null, 'Printed on'), h('dd', null, formatDate(today)),
          h('dt', null, 'Plan last reviewed'), h('dd', null, plan.info.lastReviewedAt ? formatDate(plan.info.lastReviewedAt) : 'Not yet marked as reviewed'),
          plan.info.trustedContact ? [h('dt', null, 'First person to contact'), h('dd', null, plan.info.trustedContact)] : null,
        ),
        h('div', { class: 'pk-note' },
          h('p', null, h('strong', null, 'Check that this is current. '), 'Details change. If something looks out of date, confirm it with a trusted contact before acting on it.'),
          h('p', null, h('strong', null, 'Keep this private. '), opts.includePrivate ? 'This copy includes private details. Store it somewhere secure and shred old copies.' : 'Private details were left out of this copy. Store it somewhere secure and shred old copies.'),
          h('p', null, h('strong', null, 'This is not a will. '), 'It is practical guidance, not a legal document. If there is a will or other legal paperwork, it takes priority over anything written here.'),
        ),
      ));
    } else if (part === 'start-here') {
      out.append(h('section', { class: 'pk-start' }, h('h2', null, 'Start here'), paragraphs(startHereText(plan))));
    } else if (part === 'immediate') {
      const first = plan.checklist.filter((c) => c.group === CHECKLIST_GROUPS[0]);
      out.append(h('section', { class: 'pk-section' }, h('h2', null, 'Immediate actions'),
        plan.records.plans.length ? plan.records.plans.map((r) => recordBlock(plan, 'plans', r, opts.includePrivate)) : null,
        first.length ? [h('h3', null, 'First 24 hours'), checklistList(first)] : null,
        !plan.records.plans.length && !first.length ? empty('No immediate actions have been written down.') : null,
      ));
    } else if (part === 'contacts') {
      out.append(h('section', { class: 'pk-section' }, h('h2', null, 'Trusted contacts'),
        plan.info.trustedContact ? h('p', null, h('strong', null, 'First person to contact: '), plan.info.trustedContact) : null,
        plan.records.contacts.map((r) => recordBlock(plan, 'contacts', r, opts.includePrivate)),
        !plan.records.contacts.length && !plan.info.trustedContact ? empty('No trusted contacts have been written down.') : null,
      ));
    } else if (part === 'checklist') {
      const rest = plan.checklist.filter((c) => c.group !== CHECKLIST_GROUPS[0]);
      if (!rest.length) continue;
      const groups = [...new Set(rest.map((c) => c.group))];
      out.append(h('section', { class: 'pk-section' }, h('h2', null, 'Checklists'), groups.map((g) => [h('h3', null, g), checklistList(rest.filter((c) => c.group === g))])));
    } else if (part === 'messages') {
      for (const m of plan.messages) {
        out.append(h('section', { class: 'pk-message' }, h('h2', null, m.title || 'A personal message'), h('p', null, h('strong', null, `For: ${m.audience || 'Everyone'}`)), paragraphs(m.body)));
      }
    } else {
      const list = plan.records[part];
      if (!list.length) continue;
      out.append(h('section', { class: 'pk-section' }, h('h2', null, SECTIONS[part].title), list.map((r) => recordBlock(plan, part, r, opts.includePrivate))));
    }
  }
  out.append(h('p', { class: 'pk-footer' }, `Printed ${formatDate(today)} from Family Continuity Planner ${__APP_VERSION__}. This packet is an organizational aid, not legal, financial, or medical advice.`));
  return out;
}

export function printPacket(plan: Plan, includePrivate: boolean): void {
  const target = document.getElementById('print-packet');
  if (!target) return;
  clear(target);
  target.append(buildPacket(plan, { includePrivate }));
  window.print();
}
