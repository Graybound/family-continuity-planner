import { activeFindings } from '../../core/audit';
import { LEVELS, LEVEL_LABELS, MODULE_STATUS_LABELS, moduleStatus, readiness } from '../../core/readiness';
import { SECTIONS, SECTION_IDS } from '../../core/sections';
import { h } from '../dom';
import { exportBackup } from '../backupFlow';
import { getPlan, go } from '../store';
import { button, goTarget, willNotice } from './common';

export function dashboardView(): HTMLElement {
  const plan = getPlan();
  const rd = readiness(plan);
  const { active } = activeFindings(plan);
  const nextReq = rd.next[0];
  const currentIdx = LEVELS.indexOf(rd.level);

  const hero = h('section', { class: 'hero', attrs: { 'aria-labelledby': 'dash-title' } },
    h('div', null,
      h('p', { class: 'eyebrow' }, plan.info.planName || 'Your continuity plan'),
      h('h1', { class: 'view-title', attrs: { id: 'dash-title', tabindex: -1 } }, 'Start with the information only you know.'),
      h('p', null, 'You do not need to document your entire life today. Each small piece you add makes things easier for the people you care about. Everything stays in this browser until you export it.'),
      h('div', { class: 'btn-row', style: { 'margin-top': '20px' } },
        nextReq ? button(`Next: ${nextReq.label}`, () => goTarget(nextReq.target), { cls: 'btn signal' }) : button('Review the plan', () => go({ name: 'review' }), { cls: 'btn signal' }),
        !plan.assessment.completedAt ? button('Take the continuity assessment', () => go({ name: 'get-started', step: 0 })) : null,
        nextReq?.id === 'basic-backup' ? null : button('Export backup', exportBackup),
      ),
    ),
    h('div', { class: 'readiness-panel', attrs: { 'aria-labelledby': 'readiness-h' } },
      h('p', { class: 'eyebrow' }, 'Readiness'),
      h('h2', { attrs: { id: 'readiness-h' } }, rd.label),
      h('p', null, rd.description),
      h('ol', { class: 'level-steps', attrs: { 'aria-label': 'Readiness levels' } }, LEVELS.map((l, i) => h('li', { attrs: { 'aria-current': l === rd.level ? 'step' : undefined } },
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
        button('Go', () => goTarget(r.target), { cls: 'btn small', ariaLabel: `Go: ${r.label}` }),
      ))),
      h('details', { style: { 'margin-top': '12px' } },
        h('summary', null, 'How readiness levels work'),
        h('p', { class: 'lede' }, 'Levels are reached in order. Each one needs every item listed for it and for the levels before it. Readiness is a guide to usefulness, not a promise that the plan is complete.'),
        h('ul', { class: 'req-list' }, rd.requirements.map((r) => h('li', { class: 'req' },
          h('span', { class: ['mark', r.met ? 'status-done' : 'status-todo'], attrs: { 'aria-hidden': 'true' } }, r.met ? '✓' : ''),
          h('div', null, h('strong', null, r.label), h('p', null, `${LEVEL_LABELS[r.level]}. ${r.met ? 'Done.' : 'Not yet.'}`)),
        ))),
      ),
    )
    : h('p', { class: 'lede' }, 'You have reached the highest readiness level. Keep the plan current with a yearly review and regular backups.');

  const map = h('section', { attrs: { 'aria-labelledby': 'map-h' } },
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
  );

  const findings = active.length
    ? h('section', { attrs: { 'aria-labelledby': 'find-h' } },
      h('h2', { class: 'section-h', attrs: { id: 'find-h' } }, 'Suggestions to review'),
      h('ul', { class: 'req-list' }, active.slice(0, 3).map((f) => h('li', { class: 'req' },
        h('div', null, h('strong', null, f.title), h('p', null, f.why)),
        button('Go', () => goTarget(f.target), { cls: 'btn small', ariaLabel: `Go: ${f.title}` }),
      ))),
      active.length > 3 ? h('p', null, button(`See all ${active.length} suggestions`, () => go({ name: 'review' }), { cls: 'btn link' })) : null,
    )
    : null;

  const will = willNotice();
  will.style.setProperty('margin-top', '20px');
  return h('div', null, hero, will, nextList, findings, map);
}
