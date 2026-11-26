import { formatDate } from '../../core/dates';
import { HANDOFF_CHECKED_ON, HANDOFF_METHODS, PRACTICE_HANDOFF_NOTE, practiceHandoffItem, practiceStatus } from '../../core/handoff';
import { h } from '../dom';
import { getPlan, go, mutate } from '../store';
import { button } from './common';

/** Guidance in Accounts: how to hand over access without the plan holding secrets, and a practice step. */
export function handoffGuide(): HTMLElement {
  const status = practiceStatus(getPlan().checklist);
  const practice = status === 'done'
    ? h('p', { attrs: { 'data-practice': 'done' } }, 'Done. You practiced the handoff. Do it again if you change password managers or who has access.')
    : status === 'planned'
      ? [
        h('p', { attrs: { 'data-practice': 'planned' } }, 'This is on your checklist. Tick it there once it has worked.'),
        button('Open the checklist', () => go({ name: 'checklist' }), { cls: 'btn small', focusKey: 'practice-open' }),
      ]
      : [
        h('p', { attrs: { 'data-practice': 'not-planned' } }, PRACTICE_HANDOFF_NOTE),
        button('Add this to my checklist', () => mutate((p) => {
          if (practiceStatus(p.checklist) === 'not-planned') p.checklist.push(practiceHandoffItem());
        }, { message: 'Added to your checklist', log: 'Added "Practice the handoff once" to the checklist' }), { cls: 'btn small primary', focusKey: 'practice-add' }),
      ];

  return h('section', { class: 'card card-pad handoff-guide', attrs: { 'aria-labelledby': 'handoff-h' } },
    h('h2', { attrs: { id: 'handoff-h' } }, 'Hand over access without writing down passwords'),
    h('p', null, 'Your family needs to get into your accounts, but this plan is not locked. So write where each login is kept, who can get to it, and the exact steps. Never the password itself.'),
    h('details', null,
      h('summary', null, `Ways to hand over access, best first (${HANDOFF_METHODS.length})`),
      h('ol', { class: 'handoff-methods' }, HANDOFF_METHODS.map((m) => h('li', null,
        h('strong', null, m.title),
        h('p', null, m.gives),
        h('p', null, h('span', { class: 'handoff-label' }, 'Keep in mind: '), m.limits),
        h('p', null, h('span', { class: 'handoff-label' }, 'In your plan, write: '), m.write),
      ))),
      h('p', { class: 'help' }, `Checked against each company's own help pages on ${formatDate(HANDOFF_CHECKED_ON)}. Their rules change, so check the current steps when you set one up.`),
    ),
    h('h3', null, 'Practice the handoff'),
    practice,
  );
}
