import { domId, h } from './dom';
import { openModal } from './dialogs';
import { printPacket } from './print';
import { getPlan } from './store';

export function openPrintDialog(): void {
  const plan = getPlan();
  const id = domId('print-private');
  const box = h('input', { attrs: { type: 'checkbox', id, 'aria-describedby': `${id}-help` }, props: { checked: plan.preferences.includePrivateInPrint } });
  const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
  const go = h('button', { class: 'btn primary', attrs: { type: 'button' } }, 'Print');
  const m = openModal({
    title: 'Print the continuity packet',
    description: 'The packet starts with a cover page and Start Here, then immediate actions, trusted contacts, and each section. Use your browser\'s print window to print or save as PDF.',
    body: [
      h('div', { class: 'check-row' }, box, h('div', null,
        h('label', { attrs: { for: id } }, h('strong', null, 'Include private details')),
        h('small', { attrs: { id: `${id}-help` } }, 'Addresses, account hints, document locations, and other fields marked private. When off, they print as "Withheld".'),
      )),
      h('div', { class: 'callout' }, h('strong', null, 'Paper copies are easy to lose track of'),
        h('p', null, 'Store printed packets somewhere secure, tell a trusted person where, and shred old copies when you print a new one. A "Save as PDF" file is just as sensitive as a backup.')),
    ],
    footer: [cancel, go],
    initialFocus: go,
  });
  cancel.addEventListener('click', m.close);
  go.addEventListener('click', () => {
    m.close();
    // Let the dialog close before the print window opens.
    window.setTimeout(() => printPacket(getPlan(), box.checked), 50);
  });
}
