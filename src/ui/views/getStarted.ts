/**
 * Guided onboarding in four steps. Steps can be visited in any order and
 * every answer is optional; answers are saved as they change.
 */
import { AREA_HANDLERS, RISK_IDS, RISK_LABELS, type AreaHandler } from '../../core/plan';
import { recommend, type Recommendation } from '../../core/recommend';
import { AREA_HINTS, AREA_IDS, AREA_LABELS, SECTIONS } from '../../core/sections';
import { h } from '../dom';
import { getPlan, go, mutate } from '../store';
import { WILL_NOTICE, button, viewHead } from './common';

// "Who does what today", not "Who handles what": that is the name of a section page.
const STEPS = ['Why this matters', 'Who does what today', 'What would stop', 'Where to start'] as const;
const HANDLER_LABELS: Record<AreaHandler, string> = {
  '': 'Not answered',
  'mostly-me': 'Mostly me',
  shared: 'Shared with someone',
  'someone-else': 'Someone else',
  'not-applicable': 'Does not apply',
};

function stepWhy(): HTMLElement {
  return h('div', { class: 'card card-pad start-text' },
    h('p', null, h('strong', null, 'You do not need to document your entire life today. Start with the information only you know.')),
    h('p', null, 'Most estate planning focuses on what you own. This planner focuses on what you know: how the bills get paid, who fixes the furnace, where the important papers are, and the hundred small routines that keep a household running.'),
    h('p', null, 'If you were suddenly unavailable, the people you care about would have to work all of that out at the hardest possible time. A few written pages can spare them a lot of stress, confusion, and unnecessary work.'),
    h('p', null, h('strong', null, `${WILL_NOTICE.title}. `), WILL_NOTICE.body),
    h('p', null, 'The next two steps take about five minutes. They help find where your family depends on you most, so you can start there. Every question is optional and you can change your answers later.'),
  );
}

function stepAreas(): HTMLElement {
  const plan = getPlan();
  const mine = AREA_IDS.filter((a) => plan.assessment.areas[a] === 'mostly-me');
  return h('div', null,
    h('p', { class: 'lede' }, 'For each area, who takes care of it today? Skip any you are not sure about. Areas you mark "Mostly me" are where your family would miss you most, so the planner suggests starting there.'),
    h('div', { class: 'card card-pad' },
      h('div', { class: 'area-grid' }, AREA_IDS.map((a) => {
        const id = `area-${a}`;
        const hintId = `${id}-hint`;
        const sel = h('select', { attrs: { id, 'data-focus-key': id, 'aria-describedby': hintId } }, AREA_HANDLERS.map((v) => h('option', { props: { value: v, selected: (plan.assessment.areas[a] ?? '') === v } }, HANDLER_LABELS[v])));
        sel.addEventListener('change', () => mutate((p) => {
          const v = sel.value as AreaHandler;
          if (v) p.assessment.areas[a] = v;
          else delete p.assessment.areas[a];
        }, { touch: false }));
        return h('div', { class: 'field' }, h('label', { attrs: { for: id } }, AREA_LABELS[a]), h('span', { class: 'help', attrs: { id: hintId } }, AREA_HINTS[a]), sel);
      })),
    ),
    h('div', { class: 'callout', style: { 'margin-top': '16px' }, attrs: { 'aria-live': 'polite' } },
      h('strong', null, mine.length ? 'These depend mostly on you' : 'Nothing marked "Mostly me" yet'),
      h('p', null, mine.length ? mine.map((a) => AREA_LABELS[a]).join(', ') : 'Areas you handle alone are where written knowledge helps most.'),
    ),
  );
}

function stepRisks(): HTMLElement {
  const plan = getPlan();
  return h('fieldset', { class: 'card card-pad' },
    h('legend', null, 'If you were unavailable tomorrow, what would stop working?'),
    h('p', { class: 'help' }, 'Choose any that apply, or none. There are no wrong answers.'),
    h('div', { class: 'choice-grid' }, RISK_IDS.map((r) => {
      const id = `risk-${r}`;
      const box = h('input', { attrs: { type: 'checkbox', id, 'data-focus-key': id }, props: { checked: plan.assessment.risks.includes(r) } });
      box.addEventListener('change', () => mutate((p) => {
        p.assessment.risks = box.checked ? [...new Set([...p.assessment.risks, r])] : p.assessment.risks.filter((x) => x !== r);
      }, { touch: false }));
      return h('div', { class: 'check-row' }, box, h('label', { attrs: { for: id } }, RISK_LABELS[r]));
    })),
  );
}

function recList(title: string, intro: string, items: Recommendation[]): HTMLElement | null {
  if (!items.length) return null;
  return h('section', { class: 'rec-tier' },
    h('h3', null, title),
    h('p', { class: 'help' }, intro),
    items.map((r) => h('div', { class: 'rec-item' },
      h('div', null, h('strong', null, r.title), h('p', null, r.reasons.join('. '))),
      button(`Open ${r.title}`, () => go({ name: 'section', section: r.section }), { cls: 'btn small primary' }),
      button('Does not apply', () => mutate((p) => {
        p.modules[r.section] = 'not-applicable';
      }, { message: `${r.title} marked as not applying` }), { cls: 'btn small', ariaLabel: `Does not apply: ${r.title}` }),
    )),
  );
}

function stepRecommend(): HTMLElement {
  const plan = getPlan();
  const rec = recommend(plan);
  return h('div', null,
    h('p', { class: 'lede' }, 'Based on your answers, here is a manageable place to start. You can work in any order and skip anything.'),
    h('div', { class: 'card card-pad' },
      recList('Priority', 'Start here. These cover what your family depends on you for most.', rec.priority),
      recList('Helpful', 'Worth doing once the priorities have something in them.', rec.helpful),
      recList('Optional', 'Add these when you have time, or not at all.', rec.optional),
      h('section', { class: 'rec-tier' },
        h('h3', null, 'Your letter to your family'),
        h('p', { class: 'help' }, 'Start Here is the first page your family reads. You can write it in your own words whenever you are ready.'),
        button('Open Start Here', () => go({ name: 'start-here' }), { cls: 'btn small' }),
      ),
      rec.notApplicable.length ? h('p', { class: 'help' }, `Marked as not applying: ${rec.notApplicable.map((s) => SECTIONS[s].title).join(', ')}. Change this on each section's page.`) : null,
    ),
  );
}

export function getStartedView(step: number): HTMLElement {
  const plan = getPlan();
  const s = Math.max(0, Math.min(STEPS.length - 1, step));
  const body = [stepWhy, stepAreas, stepRisks, stepRecommend][s]!();
  return h('div', null,
    viewHead({ eyebrow: 'Planning questions', title: 'Where should you start?', description: 'About five minutes of optional questions. Your answers suggest which pages to fill in first. This is for you, not for the people who will read the plan.' }),
    h('nav', { class: 'steps-nav', attrs: { 'aria-label': 'Question steps' } },
      h('ol', null, STEPS.map((label, i) => {
        const b = button(`${i + 1}. ${label}`, () => go({ name: 'get-started', step: i }), { cls: 'btn small', focusKey: `step:${i}` });
        if (i === s) b.setAttribute('aria-current', 'step');
        return h('li', null, b);
      })),
    ),
    body,
    h('div', { class: 'btn-row', style: { 'margin-top': '20px' } },
      s > 0 ? button('Back', () => go({ name: 'get-started', step: s - 1 })) : null,
      s < STEPS.length - 1
        ? button('Next', () => go({ name: 'get-started', step: s + 1 }), { cls: 'btn primary' })
        : button(plan.assessment.completedAt ? 'Done' : 'Finish and see my next step', () => {
          mutate((p) => {
            p.assessment.completedAt = new Date().toISOString();
          }, { message: 'Answers saved. You can change them any time.', touch: false });
          go({ name: 'dashboard' });
        }, { cls: 'btn primary' }),
    ),
  );
}
