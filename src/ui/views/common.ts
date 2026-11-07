import type { Target } from '../../core/readiness';
import { h, type Child } from '../dom';
import { openRecordDialog } from '../dialogs';
import { go } from '../store';

export function viewHead(opts: { eyebrow: string; title: string; description?: Child; actions?: Child }): HTMLElement {
  return h('div', { class: 'page-head' },
    h('div', null,
      h('p', { class: 'eyebrow' }, opts.eyebrow),
      h('h1', { class: 'view-title', attrs: { tabindex: -1 } }, opts.title),
      opts.description ? h('p', null, opts.description) : null,
    ),
    opts.actions ? h('div', { class: 'page-actions' }, opts.actions) : null,
  );
}

export function goTarget(t: Target): void {
  if (t.view === 'section') {
    go({ name: 'section', section: t.section });
    if (t.prefill) openRecordDialog(t.section, null, t.prefill);
  } else if (t.view === 'get-started') go({ name: 'get-started', step: 0 });
  else go({ name: t.view } as { name: 'settings' | 'checklist' | 'start-here' | 'review' });
}

export function button(label: Child, onClick: () => void, opts: { cls?: string; focusKey?: string; ariaLabel?: string } = {}): HTMLButtonElement {
  return h('button', {
    class: opts.cls ?? 'btn',
    attrs: { type: 'button', 'aria-label': opts.ariaLabel, 'data-focus-key': opts.focusKey },
    on: { click: onClick },
  }, label);
}
