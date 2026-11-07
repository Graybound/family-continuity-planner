import { DEFAULT_START_HERE, startHereText } from '../../core/plan';
import { h } from '../dom';
import { openMessageDialog } from '../dialogs';
import { getPlan, mutate } from '../store';
import { button, viewHead } from './common';

export function startHereView(): HTMLElement {
  const plan = getPlan();
  const custom = plan.startHere.mode === 'custom';
  const ta = h('textarea', { attrs: { id: 'start-here-text', rows: 14, 'data-focus-key': 'start-text' }, props: { value: custom ? plan.startHere.customText : DEFAULT_START_HERE } });

  const radios = (['default', 'custom'] as const).map((mode) => {
    const id = `start-mode-${mode}`;
    const r = h('input', { attrs: { type: 'radio', name: 'start-mode', id, 'data-focus-key': id }, props: { checked: plan.startHere.mode === mode } });
    r.addEventListener('change', () => mutate((p) => {
      p.startHere.mode = mode;
      // Seed a custom message with the default text so it can be edited rather than started from nothing.
      if (mode === 'custom' && !p.startHere.customText.trim()) p.startHere.customText = DEFAULT_START_HERE;
    }));
    return h('div', { class: 'check-row' }, r, h('label', { attrs: { for: id } }, mode === 'default' ? 'Use the default introduction' : 'Write or edit my own introduction'));
  });

  return h('div', null,
    viewHead({
      eyebrow: 'For the people reading your plan',
      title: 'Start Here',
      description: 'The first page your family sees, before any accounts or checklists. It should reassure them and point to the next step.',
    }),
    h('div', { class: 'grid two' },
      h('section', { class: 'card card-pad', attrs: { 'aria-labelledby': 'intro-h' } },
        h('h2', { attrs: { id: 'intro-h' }, style: { 'margin-top': '0' } }, 'Introduction'),
        h('fieldset', null, h('legend', null, 'Which introduction should the plan use?'), radios),
        custom ? [
          h('div', { class: 'field full' }, h('label', { attrs: { for: 'start-here-text' } }, 'Your introduction'), ta,
            h('span', { class: 'help' }, 'Leave a blank line between paragraphs. If you clear this completely, the default introduction is used.')),
          h('div', { class: 'btn-row', style: { 'margin-top': '12px' } },
            button('Save introduction', () => mutate((p) => {
              p.startHere.customText = ta.value;
            }, { message: 'Introduction saved' }), { cls: 'btn primary' }),
            button('Reset to default text', () => mutate((p) => {
              p.startHere.customText = DEFAULT_START_HERE;
            }, { message: 'Introduction reset to the default text' })),
          ),
        ] : null,
      ),
      h('section', { class: 'card card-pad start-text', attrs: { 'aria-labelledby': 'preview-h' } },
        h('h2', { attrs: { id: 'preview-h' }, style: { 'margin-top': '0' } }, 'What your family will read'),
        startHereText(plan).split(/\n\s*\n/).map((p) => h('p', null, p.trim())),
      ),
    ),
    h('section', { attrs: { 'aria-labelledby': 'msg-h' } },
      h('div', { class: 'page-head', style: { 'margin-top': '28px', 'margin-bottom': '12px' } },
        h('div', null, h('h2', { class: 'section-h', attrs: { id: 'msg-h' }, style: { margin: '0' } }, 'Personal messages'),
          h('p', null, 'Optional notes for specific people: a partner, children, an executor, or everyone. Each prints on its own page.')),
        h('div', { class: 'page-actions' }, button('Add a message', () => openMessageDialog(null), { cls: 'btn primary', focusKey: 'add-message' })),
      ),
      plan.messages.length
        ? h('ul', { class: 'grid two', style: { 'list-style': 'none', padding: '0', margin: '0' } }, plan.messages.map((m) => h('li', { class: 'card card-pad message-card' },
          h('h3', null, m.title || 'Untitled message'),
          h('p', { class: 'help' }, `For: ${m.audience || 'Everyone'}`),
          h('p', { class: 'multiline' }, m.body.length > 280 ? `${m.body.slice(0, 280)}…` : m.body),
          button('Edit', () => openMessageDialog(m), { cls: 'btn small', ariaLabel: `Edit message: ${m.title || 'Untitled message'}`, focusKey: `edit-msg:${m.id}` }),
        )))
        : h('div', { class: 'card empty' }, h('strong', null, 'No messages yet'), h('span', null, 'Messages are entirely optional.')),
    ),
  );
}
