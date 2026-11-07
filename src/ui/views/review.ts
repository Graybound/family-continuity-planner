import { activeFindings, deferUntil } from '../../core/audit';
import { formatDate } from '../../core/dates';
import { h } from '../dom';
import { getPlan, mutate } from '../store';
import { button, goTarget, viewHead } from './common';

export function reviewView(): HTMLElement {
  const plan = getPlan();
  const { active, hidden } = activeFindings(plan);
  return h('div', null,
    viewHead({
      eyebrow: 'Continuity review',
      title: 'Suggestions to review',
      description: 'Automatic checks for likely gaps, based only on what is in this plan. Each one explains why it appeared. They are suggestions, never a verdict that the plan is or is not complete.',
    }),
    active.length
      ? h('ul', { class: 'grid', style: { 'list-style': 'none', padding: '0', margin: '0' } }, active.map((f) => h('li', { class: 'card finding' },
        h('h2', null, f.title),
        h('p', null, h('strong', null, 'Why this appeared: '), f.why),
        h('div', { class: 'btn-row' },
          button('Go there', () => goTarget(f.target), { cls: 'btn small primary', ariaLabel: `Go there: ${f.title}` }),
          button('Remind me in 30 days', () => mutate((p) => {
            p.audit.deferred[f.id] = deferUntil();
          }, { message: `Hidden until ${formatDate(deferUntil())}`, touch: false }), { cls: 'btn small', ariaLabel: `Remind me in 30 days: ${f.title}` }),
          button('Dismiss', () => mutate((p) => {
            p.audit.dismissed.push(f.id);
          }, { message: 'Suggestion dismissed', touch: false }), { cls: 'btn small', ariaLabel: `Dismiss: ${f.title}` }),
        ),
      )))
      : h('div', { class: 'card empty' },
        h('strong', null, 'Nothing to suggest right now'),
        h('span', null, 'None of the automatic checks found a gap. That does not mean the plan is complete; only you know what is missing.'),
      ),
    hidden
      ? h('p', { style: { 'margin-top': '16px' } }, `${hidden} suggestion${hidden === 1 ? ' is' : 's are'} dismissed or snoozed. `,
        button('Show them again', () => mutate((p) => {
          p.audit = { dismissed: [], deferred: {} };
        }, { message: 'All suggestions are visible again', touch: false }), { cls: 'btn link' }))
      : null,
  );
}
