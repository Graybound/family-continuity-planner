/**
 * The readable copy inside a saved plan file: the whole plan as plain HTML, with
 * instructions for opening it properly, for places that show the file without
 * running scripts (an iPhone preview, a mail app). When scripts run, the
 * stylesheet hides it and the app removes it. See
 * docs/specs/self-contained-plan-file.md, section 3.
 *
 * Rules: built with h() only, no style attributes (the CSP blocks them even with
 * scripts off), and it must read well with no stylesheet at all.
 */
import { NEWEST_COPY_LINE, STATIC_ID, savedHeadline } from '../core/embedded';
import { formatSavedTime } from '../core/dates';
import type { Plan } from '../core/plan';
import { h } from './dom';
import { PACKET_ORDER, buildPacket } from './print';

export function buildReadableCopy(plan: Plan, savedAt: string, locale?: string): HTMLElement {
  const name = plan.info.planName || 'a family plan';
  const headline = savedHeadline(plan.info.ownerName, formatSavedTime(savedAt, locale));
  const step = (who: string, what: string) => h('li', null, h('strong', null, `${who}: `), what);
  return h('div', { class: 'static-plan', attrs: { id: STATIC_ID, lang: 'en' } },
    h('header', { class: 'static-intro' },
      h('h1', null, `This is ${name}.`),
      headline ? h('p', null, headline, ' ', NEWEST_COPY_LINE) : h('p', null, NEWEST_COPY_LINE),
      h('p', null, 'You can read everything on this page. To make changes, open it properly:'),
      h('ul', null,
        step('On a Windows or Mac computer', 'save this file, then double-click it. It opens in your web browser.'),
        step('On an iPhone or iPad', 'you can read it here, but you can\'t make changes on an iPhone. Use a computer for that.'),
        step('On an Android phone', 'save the file, open the Files app, tap the file, and choose Chrome if it asks.'),
        step('If you\'re reading this inside an email', 'download or save the attachment first, then follow the steps above.'),
      ),
      h('p', null, 'Anyone who has this file can read everything in it. Keep it where you\'d keep a paper copy.'),
    ),
    buildPacket(plan, { includePrivate: true, parts: PACKET_ORDER.filter((p) => p !== 'cover'), footer: false, links: true }),
  );
}
