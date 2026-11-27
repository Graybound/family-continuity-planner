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
  const name = plan.info.planName || 'a saved family plan';
  const headline = savedHeadline(plan.info.ownerName, formatSavedTime(savedAt, locale));
  const step = (who: string, what: string) => h('li', null, h('strong', null, `${who}: `), what);
  return h('div', { class: 'static-plan', attrs: { id: STATIC_ID, lang: 'en' } },
    h('header', { class: 'static-intro' },
      h('h1', null, `This is ${name}.`),
      headline ? h('p', null, headline, ' ', NEWEST_COPY_LINE) : h('p', null, NEWEST_COPY_LINE),
      h('p', null, h('strong', null, 'This file is the whole planner app with this plan inside, not only a printout. '), 'What you see here is a read-only copy, because this preview can\'t run the app. To use the app and make changes, open the file in a web browser on a computer or an Android phone:'),
      h('ul', null,
        step('On a Windows or Mac computer', 'save this file, then double-click it. The full planner opens in your web browser with this plan, ready to change. No internet or website is needed.'),
        step('On an iPhone or iPad', 'this read-only copy is all an iPhone can show. It can\'t run the planner from a file. Send the file to a computer to make changes.'),
        step('On an Android phone', 'save the file, open the Files app, tap the file, and choose Chrome if it asks.'),
        step('If you\'re reading this inside an email', 'download or save the attachment first, then follow the steps above.'),
      ),
      h('p', null, 'Anyone who has this file can read everything in it. Keep it where you\'d keep a paper copy.'),
    ),
    buildPacket(plan, { includePrivate: true, parts: PACKET_ORDER.filter((p) => p !== 'cover'), footer: false, links: true }),
  );
}
