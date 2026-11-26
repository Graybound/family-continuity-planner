import { activeFindings, withoutTwins } from '../../core/audit';
import { LEVELS, LEVEL_LABELS, MODULE_STATUS_LABELS, moduleStatus, readiness } from '../../core/readiness';
import { SECTIONS, SECTION_IDS } from '../../core/sections';
import { h } from '../dom';
import { getPlan, go } from '../store';
import { button, goTarget, targetLabel } from './common';

export function dashboardView(): HTMLElement {
  const plan = getPlan();
  const rd = readiness(plan);
  const nextReq = rd.next[0];
  // A gap that is already a next step is not repeated under suggestions.
  const active = withoutTwins(activeFindings(plan).active, rd.next.map((r) => r.id));
  const currentIdx = LEVELS.indexOf(rd.level);

  const hero = h('section', { class: 'hero', attrs: { 'aria-labelledby': 'dash-title' } },
    h('div', null,
      h('p', { class: 'eyebrow' }, plan.info.planName || 'Your plan'),
      h('h1', { class: 'view-title', attrs: { id: 'dash-title', tabindex: -1 } }, 'Start with the information only you know.'),
      h('p', null, 'You do not need to document your entire life today. Each small piece you add makes things easier for the people you care about. Everything stays in this browser until you export it.'),
      // Exactly one button here: the next step. Export backup is in the top bar, and is the next step when it matters.
      h('div', { class: 'btn-row', style: { 'margin-top': '20px' } },
        nextReq ? button(`Next: ${nextReq.label}`, () => goTarget(nextReq.target), { cls: 'btn signal' }) : button('Look for anything you missed', () => go({ name: 'review' }), { cls: 'btn signal' }),
      ),
      !plan.assessment.completedAt
        ? h('p', { class: 'hero-aside' }, 'Not sure where to begin? ', button('Answer a few planning questions', () => go({ name: 'get-started', step: 0 }), { cls: 'btn link' }), ' and the planner will suggest which pages matter most for you.')
        : null,
    ),
    h('div', { class: 'readiness-panel', attrs: { 'aria-labelledby': 'readiness-h' } },
      h('p', { class: 'eyebrow' }, 'How ready your plan is'),
      h('h2', { attrs: { id: 'readiness-h' } }, rd.label),
      h('p', null, rd.description),
      h('ol', { class: 'level-steps', attrs: { 'aria-label': 'Levels' } }, LEVELS.map((l, i) => h('li', { attrs: { 'aria-current': l === rd.level ? 'step' : undefined } },
        h('span', { class: 'mark', attrs: { 'aria-hidden': 'true' } }, i <= currentIdx ? '✓' : ''),
        LEVEL_LABELS[l],
        h('span', { class: 'sr-only' }, i < currentIdx ? ' (reached)' : l === rd.level ? ' (current level)' : ' (not yet)'),
      ))),
    ),
  );

  const nextList = rd.nextLevel
    ? h('section', { attrs: { 'aria-labelledby': 'next-h' } },
      h('h2', { class: 'section-h', attrs: { id: 'next-h' } }, `To reach ${LEVEL_LABELS[rd.nextLevel]}`),
      h('ul', { class: 'req-list' }, rd.next.map((r) => h('li', { class: 'req' },
        h('span', { class: 'mark status-todo', attrs: { 'aria-hidden': 'true' } }, ''),
        h('div', null, h('strong', null, r.label), h('p', null, r.why)),
        button(targetLabel(r.target), () => goTarget(r.target), { cls: 'btn small', ariaLabel: `${targetLabel(r.target)}: ${r.label}` }),
      ))),
      h('details', { style: { 'margin-top': '12px' } },
        h('summary', null, 'How these levels work'),
        h('p', { class: 'lede' }, 'Levels are reached in order. Each one needs every item listed for it and for the levels before it. A level is a guide to how useful the plan is, not a promise that it is complete.'),
        h('ul', { class: 'req-list' }, rd.requirements.map((r) => h('li', { class: 'req' },
          h('span', { class: ['mark', r.met ? 'status-done' : 'status-todo'], attrs: { 'aria-hidden': 'true' } }, r.met ? '✓' : ''),
          h('div', null, h('strong', null, r.label), h('p', null, `${LEVEL_LABELS[r.level]}. ${r.met ? 'Done.' : 'Not yet.'}`)),
        ))),
      ),
    )
    : h('p', { class: 'lede' }, 'You have reached the highest readiness level. Keep the plan current with a yearly review and regular backups.');

  // On a new plan every card said "0 entries, Not started": noise before the first step. Show it once there is something in it.
  const map = SECTION_IDS.some((s) => plan.records[s].length || moduleStatus(plan, s) !== 'not-started') ? h('section', { attrs: { 'aria-labelledby': 'map-h' } },
    h('h2', { class: 'section-h', attrs: { id: 'map-h' } }, 'Your plan at a glance'),
    h('ul', { class: 'grid three', style: { 'list-style': 'none', padding: '0', margin: '0' } }, SECTION_IDS.map((s) => {
      const st = moduleStatus(plan, s);
      const n = plan.records[s].length;
      return h('li', null, h('button', { class: 'card section-card', attrs: { type: 'button' }, on: { click: () => go({ name: 'section', section: s }) } },
        h('span', { class: 'title' }, SECTIONS[s].title),
        h('span', { class: 'meta' }, `${n} entr${n === 1 ? 'y' : 'ies'}`),
        h('span', null, h('span', { class: ['chip', st === 'not-started' && 'todo', st === 'not-applicable' && 'muted'] }, MODULE_STATUS_LABELS[st])),
      ));
    })),
  ) : null;

  const findings = active.length
    ? h('section', { attrs: { 'aria-labelledby': 'find-h' } },
      h('h2', { class: 'section-h', attrs: { id: 'find-h' } }, 'Suggestions to review'),
      h('ul', { class: 'req-list' }, active.slice(0, 3).map((f) => h('li', { class: 'req' },
        h('div', null, h('strong', null, f.title), h('p', null, f.why)),
        button(targetLabel(f.target), () => goTarget(f.target), { cls: 'btn small', ariaLabel: `${targetLabel(f.target)}: ${f.title}` }),
      ))),
      active.length > 3 ? h('p', null, button(`See all ${active.length} suggestions`, () => go({ name: 'review' }), { cls: 'btn link' })) : null,
    )
    : null;

  // The "not a will" notice is not repeated here: the creator reads it in the planning questions,
  // in the Documents callout (which Basic readiness sends them to), and in print.
  return h('div', null, hero, nextList, findings, map);
}
