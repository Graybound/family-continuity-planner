/**
 * After every Export backup and Export .json: say what was saved, offer the PDF
 * (step 2 of the export set), and, until it has been done, ask the creator to
 * open a copy on the family's own device once. See
 * docs/specs/self-contained-plan-file.md, section 6.
 *
 * The PDF comes only from the browser's print window: no new dependency and no
 * PDF made in the app. The app cannot tell whether the PDF was saved.
 */
import { formatSavedTime, todayString } from '../core/dates';
import { NEWEST_COPY_LINE, savedHeadline } from '../core/embedded';
import { domId, h } from './dom';
import { openModal } from './dialogs';
import { printPacket } from './print';
import { getPlan, mutate } from './store';

export const FAMILY_STEP_TITLE = 'Send this to the phone or computer your family uses, and open it there once.';
export const FAMILY_STEP_TEXT = 'Email it, put it on a shared drive or a USB stick, whatever they\'d actually use. Open the plan file and the PDF on their device, and check that the plan shows up.';

/** The checkbox that records a successful open on the family's device, in info.familyOpenedAt. */
export function familyOpenedCheckbox(focusKey?: string): HTMLElement {
  const id = domId('family-opened');
  // A focus key only where the view re-renders around it (Settings), never inside a dialog.
  const box = h('input', { attrs: { type: 'checkbox', id }, props: { checked: !!getPlan().info.familyOpenedAt }, dataset: focusKey ? { focusKey } : undefined });
  box.addEventListener('change', () => {
    mutate((p) => {
      p.info.familyOpenedAt = box.checked ? todayString() : '';
    }, { message: box.checked ? 'Noted: a saved copy opened on your family\'s device.' : 'Cleared.', log: box.checked ? 'Confirmed a saved copy opened on the family\'s device' : undefined });
  });
  return h('div', { class: 'check-row' }, box, h('label', { attrs: { for: id } }, h('strong', null, 'It opened on their device')));
}

/** The saved-at line for the printed packet: the same words as the app and the readable copy. */
export function packetSavedLine(ownerName: string, savedAt: string): string {
  const headline = savedHeadline(ownerName, formatSavedTime(savedAt)) || 'This copy was saved.';
  return `${headline} ${NEWEST_COPY_LINE}`;
}

export function openExportSetDialog(opts: { fileName: string; stem: string; savedAt: string; kind: 'html' | 'json' }): void {
  const plan = getPlan();
  const privId = domId('pdf-private');
  const box = h('input', { attrs: { type: 'checkbox', id: privId, 'aria-describedby': `${privId}-help` }, props: { checked: true } });
  const skip = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Skip for now');
  const pdf = h('button', { class: 'btn primary', attrs: { type: 'button' } }, 'Save the PDF');
  const about = opts.kind === 'html'
    ? 'It holds the app and your whole plan, and opens offline: double-click it. Anyone who has this file can read everything in it. Keep it where you\'d keep a paper copy.'
    : 'It holds your plan data, readable in a text editor. Anyone who has this file can read everything in it. Keep it where you\'d keep a paper copy.';
  const m = openModal({
    title: `Saved ${opts.fileName}`,
    description: about,
    body: [
      h('h3', null, 'Step 2 of 2: save a PDF too'),
      h('p', null, 'A PDF opens on any phone or computer, even where the plan file can\'t. In the print window, choose ', h('strong', null, 'Save as PDF'), ' as the printer, then save. It will be named to match.'),
      h('div', { class: 'check-row' }, box, h('div', null,
        h('label', { attrs: { for: privId } }, h('strong', null, 'Include private details')),
        h('small', { attrs: { id: `${privId}-help` } }, 'This PDF is for your family. It includes private details, like the plan file does.'),
      )),
      plan.info.familyOpenedAt ? null : h('div', { class: 'callout' },
        h('strong', null, FAMILY_STEP_TITLE),
        h('p', null, FAMILY_STEP_TEXT, ' You can tick this later in Settings.'),
        familyOpenedCheckbox(),
      ),
    ],
    footer: [skip, pdf],
    initialFocus: pdf,
  });
  skip.addEventListener('click', m.close);
  pdf.addEventListener('click', () => {
    m.close();
    // Let the dialog close before the print window opens.
    window.setTimeout(() => printPacket(getPlan(), box.checked, { title: opts.stem, savedLine: packetSavedLine(getPlan().info.ownerName, opts.savedAt) }), 50);
  });
}
