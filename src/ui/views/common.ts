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

export const WILL_NOTICE = {
  title: 'This is not a will',
  body: 'A will says who receives what and who is in charge. This planner explains how things work day to day. They do different jobs, so we recommend having both. If you do not have a will, or yours is out of date, talk with a qualified estate planning professional where you live. The rules differ from place to place.',
};

/** Calm, visible reminder that the planner works alongside a will and does not replace one. */
export function willNotice(): HTMLElement {
  return h('aside', { class: 'callout will-notice', attrs: { 'aria-labelledby': 'will-notice-h' } },
    h('strong', { attrs: { id: 'will-notice-h' } }, WILL_NOTICE.title),
    h('p', null, WILL_NOTICE.body),
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
