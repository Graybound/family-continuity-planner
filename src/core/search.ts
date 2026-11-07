import type { Plan } from './plan';
import { SECTIONS, SECTION_IDS, recordTitle, type SectionId } from './sections';

export type SearchHit =
  | { kind: 'record'; section: SectionId; id: string; title: string; context: string }
  | { kind: 'checklist'; id: string; title: string; context: string }
  | { kind: 'message'; id: string; title: string; context: string };

/**
 * Case-insensitive search across records, checklist items, and messages.
 * Every word in the query must appear somewhere in the item.
 * When privacy mode is on, private fields are not searched so hidden text cannot be probed.
 */
export function search(plan: Plan, query: string, opts: { includePrivate: boolean; limit?: number } = { includePrivate: true }): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const limit = opts.limit ?? 50;
  const match = (text: string) => words.every((w) => text.includes(w));
  const hits: SearchHit[] = [];
  for (const s of SECTION_IDS) {
    const def = SECTIONS[s];
    for (const r of plan.records[s]) {
      const text = def.fields.filter((f) => opts.includePrivate || !f.private).map((f) => r[f.key] ?? '').join(' ').toLowerCase();
      if (match(text)) hits.push({ kind: 'record', section: s, id: r.id, title: recordTitle(s, r), context: def.title });
    }
  }
  for (const c of plan.checklist) {
    if (match(`${c.title} ${c.note} ${c.group}`.toLowerCase())) hits.push({ kind: 'checklist', id: c.id, title: c.title, context: `Checklist: ${c.group}` });
  }
  for (const m of plan.messages) {
    const text = opts.includePrivate ? `${m.title} ${m.audience} ${m.body}` : `${m.title} ${m.audience}`;
    if (match(text.toLowerCase())) hits.push({ kind: 'message', id: m.id, title: m.title || 'Untitled message', context: `Message for ${m.audience || 'anyone'}` });
  }
  return hits.slice(0, limit);
}
