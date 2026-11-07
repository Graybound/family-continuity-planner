import { search } from '../core/search';
import { clear, domId, h } from './dom';
import { openChecklistDialog, openMessageDialog, openModal, openRecordDialog } from './dialogs';
import { getPlan, go, ui } from './store';

export function openSearch(): void {
  if (document.querySelector('dialog[data-search]')) return;
  const inputId = domId('search');
  const countId = domId('search-count');
  const input = h('input', { class: 'search-input', attrs: { id: inputId, type: 'search', autocomplete: 'off', 'aria-describedby': countId, 'aria-controls': `${inputId}-results` } });
  const count = h('p', { class: 'help', attrs: { id: countId, 'aria-live': 'polite' } });
  const results = h('ul', { class: 'search-results', attrs: { id: `${inputId}-results`, 'aria-label': 'Search results' } });
  const m = openModal({
    title: 'Search your plan',
    description: ui.privacy ? 'Privacy mode is on, so private details are not searched.' : 'Searches every section, the checklist, and messages.',
    body: [h('label', { class: 'sr-only', attrs: { for: inputId } }, 'Search text'), input, count, results],
    footer: null,
    initialFocus: input,
    className: 'search-dialog',
  });
  m.dialog.dataset.search = '1';
  const run = () => {
    const hits = search(getPlan(), input.value, { includePrivate: !ui.privacy, limit: 50 });
    clear(results);
    count.textContent = input.value.trim() ? `${hits.length} result${hits.length === 1 ? '' : 's'}` : `Showing ${hits.length} entr${hits.length === 1 ? 'y' : 'ies'}. Type to narrow.`;
    for (const hit of hits) {
      const btn = h('button', { class: 'search-result', attrs: { type: 'button' } }, h('strong', null, hit.title), h('small', null, hit.context));
      btn.addEventListener('click', () => {
        m.close();
        if (hit.kind === 'record') {
          go({ name: 'section', section: hit.section });
          openRecordDialog(hit.section, hit.id);
        } else if (hit.kind === 'checklist') {
          go({ name: 'checklist' });
          const item = getPlan().checklist.find((c) => c.id === hit.id);
          if (item) openChecklistDialog(item);
        } else {
          go({ name: 'start-here' });
          const msg = getPlan().messages.find((x) => x.id === hit.id);
          if (msg) openMessageDialog(msg);
        }
      });
      results.append(h('li', null, btn));
    }
  };
  input.addEventListener('input', run);
  // Arrow keys move between the input and results.
  m.dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [input, ...results.querySelectorAll<HTMLButtonElement>('button')];
    const idx = items.indexOf(document.activeElement as HTMLInputElement);
    if (idx < 0) return;
    e.preventDefault();
    const next = items[Math.max(0, Math.min(items.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))];
    next?.focus();
  });
  run();
}
