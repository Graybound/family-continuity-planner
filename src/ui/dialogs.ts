/**
 * Accessible modal dialogs built on the native <dialog> element, which
 * provides focus trapping, Escape to close, and an inert background.
 */
import { newId } from '../core/ids';
import type { ChecklistItem, Message } from '../core/plan';
import { CHECKLIST_GROUPS, SECTIONS, recordTitle, type FieldDef, type SectionId } from '../core/sections';
import { looksLikeSecret } from '../core/audit';
import { append, domId, h, type Child } from './dom';
import { getPlan, mutate } from './store';

export interface Modal {
  dialog: HTMLDialogElement;
  /** The form wrapping body and footer when opened with onSubmit. */
  form: HTMLFormElement | null;
  close: () => void;
}

export function openModal(opts: {
  title: string;
  description?: string;
  body: Child;
  footer: Child;
  onClose?: () => void;
  /** When set, the dialog content is a form; native validation runs before this is called. */
  onSubmit?: (form: HTMLFormElement, m: Modal) => void;
  initialFocus?: HTMLElement;
  className?: string;
}): Modal {
  const opener = document.activeElement as HTMLElement | null;
  const titleId = domId('dlg-title');
  const descId = opts.description ? domId('dlg-desc') : undefined;
  const dialog = h('dialog', { class: opts.className, attrs: { 'aria-labelledby': titleId, 'aria-describedby': descId } });
  const close = () => {
    if (dialog.open) dialog.close();
  };
  const inner = opts.onSubmit ? h('form', { class: 'dialog-inner' }) : h('div', { class: 'dialog-inner' });
  dialog.append(inner);
  append(inner, [
      h('div', { class: 'dialog-head' },
        h('div', null, h('h2', { attrs: { id: titleId } }, opts.title), opts.description ? h('p', { attrs: { id: descId } }, opts.description) : null),
        h('button', { class: 'close-btn', attrs: { type: 'button', 'aria-label': 'Close' }, on: { click: close } }, '×'),
      ),
      h('div', { class: 'dialog-body' }, opts.body),
      opts.footer ? h('div', { class: 'dialog-foot' }, opts.footer) : null,
  ]);
  const modal: Modal = { dialog, form: inner instanceof HTMLFormElement ? inner : null, close };
  if (modal.form) {
    const form = modal.form;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      opts.onSubmit!(form, modal);
    });
  }
  dialog.addEventListener('close', () => {
    dialog.remove();
    opts.onClose?.();
    // Return focus to whatever opened the dialog if it still exists, otherwise to the main region.
    if (opener && document.contains(opener)) opener.focus();
    else document.getElementById('main-content')?.focus();
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  if (opts.initialFocus) opts.initialFocus.focus();
  return modal;
}

export function confirmDialog(opts: { title: string; message: string; confirmLabel: string; danger?: boolean; acknowledge?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    let result = false;
    const ackId = domId('ack');
    const ack = opts.acknowledge ? h('input', { attrs: { type: 'checkbox', id: ackId } }) : null;
    const ok = h('button', { class: ['btn', opts.danger ? 'danger' : 'primary'], attrs: { type: 'button' }, props: { disabled: !!ack } }, opts.confirmLabel);
    ack?.addEventListener('change', () => (ok.disabled = !ack.checked));
    const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
    const m = openModal({
      title: opts.title,
      body: [h('p', { class: 'multiline' }, opts.message), ack ? h('div', { class: 'check-row' }, ack, h('label', { attrs: { for: ackId } }, opts.acknowledge!)) : null],
      footer: [cancel, ok],
      initialFocus: cancel,
      onClose: () => resolve(result),
    });
    cancel.addEventListener('click', m.close);
    ok.addEventListener('click', () => {
      result = true;
      m.close();
    });
  });
}

function fieldControl(f: FieldDef, value: string, id: string, describedBy: string | undefined): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const attrs = { id, name: f.key, required: !!f.required, 'aria-describedby': describedBy };
  if (f.type === 'textarea') return h('textarea', { attrs: { ...attrs, rows: 4 }, props: { value } });
  if (f.type === 'select') {
    const opts = [...(f.options ?? [])];
    // Keep values that are not in the list (for example from an older backup) so editing never loses them.
    if (value && !opts.includes(value)) opts.unshift(value);
    return h('select', { attrs }, h('option', { props: { value: '' } }, 'Choose'), opts.map((o) => h('option', { props: { value: o, selected: o === value } }, o)));
  }
  return h('input', { attrs: { ...attrs, type: f.type ?? 'text', autocomplete: 'off' }, props: { value } });
}

export function openRecordDialog(section: SectionId, id: string | null, prefill: Record<string, string> = {}): void {
  const def = SECTIONS[section];
  const existing = id ? getPlan().records[section].find((r) => r.id === id) : undefined;
  const values: Record<string, string> = existing ? { ...existing } : { ...prefill };
  const grid = h('div', { class: 'form-grid' });
  let firstControl: HTMLElement | null = null;
  for (const f of def.fields) {
    const id2 = domId(`f-${f.key}`);
    const helpTexts = [f.help, f.private ? 'Private: hidden in privacy mode and left out of printouts unless you choose otherwise.' : ''].filter(Boolean);
    const helpId = helpTexts.length ? domId('help') : undefined;
    const control = fieldControl(f, values[f.key] ?? '', id2, helpId);
    firstControl ??= control;
    grid.append(h('div', { class: ['field', f.wide && 'full'] },
      h('label', { attrs: { for: id2 } }, f.label, f.required ? h('span', { class: 'req-star' }, ' (required)') : null),
      control,
      helpId ? h('span', { class: 'help', attrs: { id: helpId } }, helpTexts.join(' ')) : null,
    ));
  }
  const save = h('button', { class: 'btn primary', attrs: { type: 'submit' } }, 'Save');
  const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
  const del = existing ? h('button', { class: 'btn danger spacer', attrs: { type: 'button' } }, 'Delete') : null;
  const m = openModal({
    title: `${existing ? 'Edit' : 'Add'} ${def.singular}`,
    description: def.description,
    body: [grid, h('p', { class: 'help' }, 'Do not enter passwords, PINs, or full account numbers. Record where they are kept instead.')],
    footer: [del, cancel, save],
    initialFocus: firstControl ?? undefined,
    onSubmit: (form) => {
    const fd = new FormData(form);
    const rec: Record<string, string> & { id: string } = { id: existing?.id ?? newId() };
    for (const f of def.fields) rec[f.key] = String(fd.get(f.key) ?? '').trim();
    const secret = looksLikeSecret(def.fields.map((f) => rec[f.key]).join('\n'));
    mutate((p) => {
      const list = p.records[section];
      const idx = existing ? list.findIndex((r) => r.id === existing.id) : -1;
      if (idx >= 0) list[idx] = rec;
      else list.push(rec);
    }, { message: secret ? 'Saved. This entry may contain a password or card number; consider removing it.' : `${def.singular[0]!.toUpperCase()}${def.singular.slice(1)} saved`, log: `${existing ? 'Updated' : 'Added'} ${def.singular}` });
    m.close();
    },
  });
  cancel.addEventListener('click', m.close);
  del?.addEventListener('click', async () => {
    const yes = await confirmDialog({ title: `Delete ${def.singular}?`, message: `"${recordTitle(section, existing!)}" will be removed from this plan. This cannot be undone unless you restore a backup.`, confirmLabel: 'Delete', danger: true });
    if (!yes) return;
    m.close();
    mutate((p) => {
      p.records[section] = p.records[section].filter((r) => r.id !== existing!.id);
    }, { message: `${def.singular[0]!.toUpperCase()}${def.singular.slice(1)} deleted`, log: `Deleted ${def.singular}` });
  });
}

export function openChecklistDialog(item: ChecklistItem | null, defaultGroup: string = CHECKLIST_GROUPS[0]): void {
  const ids = { title: domId('ct'), group: domId('cg'), due: domId('cd'), note: domId('cn') };
  const groups: string[] = [...CHECKLIST_GROUPS];
  const group = item?.group ?? defaultGroup;
  if (!groups.includes(group)) groups.push(group);
  const title = h('input', { attrs: { id: ids.title, name: 'title', required: true, maxlength: 200, autocomplete: 'off' }, props: { value: item?.title ?? '' } });
  const body = h('div', null,
    h('div', { class: 'form-grid' },
      h('div', { class: 'field full' }, h('label', { attrs: { for: ids.title } }, 'Task', h('span', { class: 'req-star' }, ' (required)')), title),
      h('div', { class: 'field' }, h('label', { attrs: { for: ids.group } }, 'Group'), h('select', { attrs: { id: ids.group, name: 'group' } }, groups.map((g) => h('option', { props: { value: g, selected: g === group } }, g)))),
      h('div', { class: 'field' }, h('label', { attrs: { for: ids.due } }, 'Due date (optional)'), h('input', { attrs: { id: ids.due, name: 'due', type: 'date' }, props: { value: item?.due ?? '' } })),
      h('div', { class: 'field full' }, h('label', { attrs: { for: ids.note } }, 'Note'), h('textarea', { attrs: { id: ids.note, name: 'note', rows: 3 }, props: { value: item?.note ?? '' } })),
    ),
  );
  const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
  const save = h('button', { class: 'btn primary', attrs: { type: 'submit' } }, item ? 'Save' : 'Add item');
  const m = openModal({ title: item ? 'Edit checklist item' : 'Add checklist item', description: 'Keep the next action concrete and assignable.', body, footer: [cancel, save], initialFocus: title, onSubmit: (form) => {
    const fd = new FormData(form);
    const next: ChecklistItem = {
      id: item?.id ?? newId(),
      title: String(fd.get('title') ?? '').trim(),
      group: String(fd.get('group') ?? CHECKLIST_GROUPS[0]),
      due: String(fd.get('due') ?? ''),
      note: String(fd.get('note') ?? '').trim(),
      done: item?.done ?? false,
    };
    mutate((p) => {
      const idx = p.checklist.findIndex((c) => c.id === next.id);
      if (idx >= 0) p.checklist[idx] = next;
      else p.checklist.push(next);
    }, { message: item ? 'Checklist item saved' : 'Checklist item added' });
    m.close();
  } });
  cancel.addEventListener('click', m.close);
}

export function openMessageDialog(msg: Message | null): void {
  const ids = { audience: domId('ma'), title: domId('mt'), body: domId('mb') };
  const audience = h('input', { attrs: { id: ids.audience, name: 'audience', required: true, autocomplete: 'off', 'aria-describedby': `${ids.audience}-h` }, props: { value: msg?.audience ?? '' } });
  const body = h('div', null,
    h('div', { class: 'form-grid' },
      h('div', { class: 'field' }, h('label', { attrs: { for: ids.audience } }, 'Who is it for?', h('span', { class: 'req-star' }, ' (required)')), audience,
        h('span', { class: 'help', attrs: { id: `${ids.audience}-h` } }, 'For example: Everyone, My partner, The kids, My executor.')),
      h('div', { class: 'field' }, h('label', { attrs: { for: ids.title } }, 'Title'), h('input', { attrs: { id: ids.title, name: 'title', autocomplete: 'off' }, props: { value: msg?.title ?? '' } })),
      h('div', { class: 'field full' }, h('label', { attrs: { for: ids.body } }, 'Message', h('span', { class: 'req-star' }, ' (required)')), h('textarea', { attrs: { id: ids.body, name: 'body', rows: 10, required: true }, props: { value: msg?.body ?? '' } })),
    ),
  );
  const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
  const save = h('button', { class: 'btn primary', attrs: { type: 'submit' } }, 'Save message');
  const del = msg ? h('button', { class: 'btn danger spacer', attrs: { type: 'button' } }, 'Delete') : null;
  const m = openModal({ title: msg ? 'Edit message' : 'Add a personal message', description: 'Messages print on their own pages at the end of the packet.', body, footer: [del, cancel, save], initialFocus: audience, onSubmit: (form) => {
    const fd = new FormData(form);
    const next: Message = { id: msg?.id ?? newId(), audience: String(fd.get('audience') ?? '').trim(), title: String(fd.get('title') ?? '').trim(), body: String(fd.get('body') ?? '') };
    mutate((p) => {
      const idx = p.messages.findIndex((x) => x.id === next.id);
      if (idx >= 0) p.messages[idx] = next;
      else p.messages.push(next);
    }, { message: 'Message saved' });
    m.close();
  } });
  cancel.addEventListener('click', m.close);
  del?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Delete message?', message: 'This message will be removed from the plan.', confirmLabel: 'Delete', danger: true }))) return;
    m.close();
    mutate((p) => {
      p.messages = p.messages.filter((x) => x.id !== msg!.id);
    }, { message: 'Message deleted' });
  });
}
