import { formatDate } from '../../core/dates';
import { CHECKLIST_GROUPS } from '../../core/sections';
import { h, icon } from '../dom';
import { confirmDialog, openChecklistDialog } from '../dialogs';
import { getPlan, mutate } from '../store';
import { button, viewHead } from './common';

export function checklistView(): HTMLElement {
  const plan = getPlan();
  const known = new Set<string>(CHECKLIST_GROUPS);
  // Items from older or edited backups may use other group names; show them instead of hiding them (v1 hid them).
  const extra = [...new Set(plan.checklist.map((c) => c.group).filter((g) => !known.has(g)))];
  const groups = [...CHECKLIST_GROUPS, ...extra];

  return h('div', null,
    viewHead({
      eyebrow: 'Action list',
      title: 'Checklist',
      description: 'Small, visible actions. Nothing here has to be finished for the plan to be useful.',
      actions: button([icon('+'), ' Add item'], () => openChecklistDialog(null), { cls: 'btn primary', focusKey: 'add-check' }),
    }),
    groups.map((g, gi) => {
      const items = plan.checklist.filter((c) => c.group === g);
      const done = items.filter((c) => c.done).length;
      const headId = `check-group-${gi}`;
      return h('section', { class: 'card check-group', attrs: { 'aria-labelledby': headId } },
        h('div', { class: 'check-head' }, h('h2', { attrs: { id: headId } }, g), h('span', null, `${done} of ${items.length} done`)),
        items.length
          ? h('ul', { class: 'check-items' }, items.map((c) => {
            const boxId = `check-${c.id}`;
            const box = h('input', { attrs: { type: 'checkbox', id: boxId, 'data-focus-key': `check:${c.id}` }, props: { checked: c.done } });
            box.addEventListener('change', () => mutate((p) => {
              const it = p.checklist.find((x) => x.id === c.id);
              if (it) it.done = box.checked;
            }, { message: box.checked ? `Checked off: ${c.title}` : `Unchecked: ${c.title}` }));
            return h('li', { class: ['check-item', c.done && 'done'] },
              box,
              h('div', null,
                h('label', { class: 'check-title', attrs: { for: boxId } }, c.title),
                c.note ? h('small', null, c.note) : null,
                c.due ? h('small', null, `Due ${formatDate(c.due)}`) : null,
              ),
              h('div', { class: 'check-actions' },
                button('Edit', () => openChecklistDialog(c), { cls: 'btn small', ariaLabel: `Edit ${c.title}`, focusKey: `edit-check:${c.id}` }),
                button('Delete', async () => {
                  if (!(await confirmDialog({ title: 'Delete checklist item?', message: `"${c.title}" will be removed.`, confirmLabel: 'Delete', danger: true }))) return;
                  mutate((p) => {
                    p.checklist = p.checklist.filter((x) => x.id !== c.id);
                  }, { message: 'Checklist item deleted' });
                }, { cls: 'btn small danger', ariaLabel: `Delete ${c.title}` }),
              ),
            );
          }))
          : h('p', { class: 'empty' }, 'No items in this group.', ' ', button('Add one', () => openChecklistDialog(null, g), { cls: 'btn link', ariaLabel: `Add an item to ${g}` })),
      );
    }),
  );
}
