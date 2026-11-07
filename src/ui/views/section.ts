import { formatDate } from '../../core/dates';
import { MODULE_STATUS_LABELS, moduleStatus } from '../../core/readiness';
import type { StoredModuleStatus } from '../../core/plan';
import { SECTIONS, recordTitle, type SectionId } from '../../core/sections';
import { domId, h, icon, maybePrivate } from '../dom';
import { openRecordDialog } from '../dialogs';
import { getPlan, mutate, render, ui } from '../store';
import { button, viewHead } from './common';

export function sectionView(section: SectionId): HTMLElement {
  const plan = getPlan();
  const def = SECTIONS[section];
  const all = plan.records[section];
  const filter = ui.filters[section] ?? { text: '', type: 'all' };
  const filterField = def.filterField ? def.fields.find((f) => f.key === def.filterField) : undefined;

  const q = filter.text.trim().toLowerCase();
  const items = all.filter((r) => {
    if (filterField && filter.type !== 'all' && r[filterField.key] !== filter.type) return false;
    if (!q) return true;
    const text = def.fields.filter((f) => !(ui.privacy && f.private)).map((f) => r[f.key] ?? '').join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => text.includes(w));
  });

  const statusId = domId('status');
  const stored = plan.modules[section] ?? 'auto';
  const derived = all.length ? 'In progress' : 'Not started';
  const statusSelect = h('select', { attrs: { id: statusId, 'data-focus-key': `status:${section}` } },
    ([['auto', `Automatic (${derived})`], ['completed', MODULE_STATUS_LABELS.completed], ['review-later', MODULE_STATUS_LABELS['review-later']], ['not-applicable', MODULE_STATUS_LABELS['not-applicable']]] as [StoredModuleStatus, string][])
      .map(([v, l]) => h('option', { props: { value: v, selected: v === stored } }, l)),
  );
  statusSelect.addEventListener('change', () => {
    const v = statusSelect.value as StoredModuleStatus;
    mutate((p) => {
      if (v === 'auto') delete p.modules[section];
      else p.modules[section] = v;
    }, { message: v === 'auto' ? 'Section status set to automatic' : `Section marked "${MODULE_STATUS_LABELS[v]}"` });
  });

  const textId = domId('filter');
  const typeId = domId('type');
  const textInput = h('input', { attrs: { id: textId, type: 'search', autocomplete: 'off', 'data-focus-key': `filter:${section}` }, props: { value: filter.text } });
  textInput.addEventListener('input', () => {
    ui.filters[section] = { ...filter, text: textInput.value };
    render();
  });
  const typeSelect = filterField ? h('select', { attrs: { id: typeId, 'data-focus-key': `type:${section}` } },
    h('option', { props: { value: 'all', selected: filter.type === 'all' } }, 'All'),
    (filterField.options ?? []).map((o) => h('option', { props: { value: o, selected: filter.type === o } }, o)),
  ) : null;
  typeSelect?.addEventListener('change', () => {
    ui.filters[section] = { ...filter, type: typeSelect.value };
    render();
  });

  const cards = items.map((r) => {
    const title = recordTitle(section, r);
    const sub = def.subtitleField ? r[def.subtitleField] : '';
    const fields = def.fields.filter((f) => f.key !== def.titleField && f.key !== def.subtitleField && r[f.key]);
    return h('li', { class: 'card record' },
      h('div', { class: 'record-top' },
        h('div', { class: 'record-icon', attrs: { 'aria-hidden': 'true' } }, def.icon),
        h('div', null, h('h3', null, title), sub ? h('div', { class: 'record-sub' }, sub) : null),
        button('Edit', () => openRecordDialog(section, r.id), { cls: 'btn small', ariaLabel: `Edit ${title}`, focusKey: `edit:${r.id}` }),
      ),
      fields.length ? h('dl', { class: 'record-data' }, fields.map((f) => h('div', { class: f.wide || f.type === 'textarea' ? 'wide' : undefined },
        h('dt', null, f.label),
        h('dd', null, f.type === 'date' ? formatDate(r[f.key]!) : maybePrivate(r[f.key]!, !!f.private, ui.privacy)),
      ))) : null,
    );
  });

  return h('div', null,
    viewHead({
      eyebrow: 'Plan section',
      title: def.title,
      description: def.description,
      actions: button([icon('+'), ` Add ${def.singular}`], () => openRecordDialog(section, null), { cls: 'btn primary', focusKey: `add:${section}` }),
    }),
    def.callout ? h('div', { class: 'callout' }, h('strong', null, def.callout.title), h('p', null, def.callout.body)) : null,
    h('div', { class: 'tool-row' },
      h('div', { class: 'field' }, h('label', { attrs: { for: statusId } }, 'Section status'), statusSelect),
      all.length ? [
        h('div', { class: 'field' }, h('label', { attrs: { for: textId } }, `Filter ${def.title.toLowerCase()}`), textInput),
        typeSelect && filterField ? h('div', { class: 'field' }, h('label', { attrs: { for: typeId } }, filterField.label), typeSelect) : null,
        h('p', { class: 'result-count', attrs: { 'aria-live': 'polite' } }, `Showing ${items.length} of ${all.length}`),
      ] : null,
    ),
    all.length === 0
      ? h('div', { class: 'card empty' },
        h('strong', null, 'Nothing here yet'),
        h('span', null, moduleStatus(plan, section) === 'not-applicable' ? 'You marked this section as not applying to you. That is fine.' : `Add the first ${def.singular}, or set the section status to "Does not apply" if it is not relevant to you.`),
        h('div', { style: { 'margin-top': '14px' } }, button(`Add ${def.singular}`, () => openRecordDialog(section, null), { cls: 'btn primary' })),
      )
      : items.length === 0
        ? h('div', { class: 'card empty' }, h('strong', null, 'No matches'), h('span', null, 'Try a different filter.'))
        : h('ul', { class: 'records', attrs: { 'aria-label': def.title } }, cards),
  );
}
