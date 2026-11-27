/**
 * Build a saved plan file from the app's own page.
 *
 * The app cannot read its own file (the Content Security Policy forbids every
 * request, and that must not change), so it keeps a copy of its page from
 * startup, before anything renders, and adds the plan to that copy when saving.
 * See docs/specs/self-contained-plan-file.md, section 1.
 */
import { EMBED_ID, STATIC_ID, escapeJsonForHtml } from '../core/embedded';

let template: HTMLElement | null = null;

/** Call first thing at startup, before anything renders. */
export function captureTemplate(): void {
  template = document.documentElement.cloneNode(true) as HTMLElement;
}

/** The plan block in this page, if this page is a saved plan file. */
export function embeddedBackupText(): string | null {
  const el = document.getElementById(EMBED_ID);
  return el ? el.textContent : null;
}

/**
 * The saved file as text: the startup copy of the page, with any previous plan
 * block and readable copy removed, then this plan's backup JSON and readable copy
 * added. Built in a detached copy with textContent and h(), so nothing the creator
 * wrote is parsed as HTML.
 */
export function buildSavedFile(backupJson: string, readable?: HTMLElement, title?: string): string {
  if (!template) throw new Error('captureTemplate() was not called at startup.');
  const page = template.cloneNode(true) as HTMLElement;
  page.querySelectorAll(`#${EMBED_ID}, #${STATIC_ID}`).forEach((n) => n.remove());
  // The theme script sets these on every start; a saved file must not carry this browser's choice.
  page.removeAttribute('style');
  page.classList.remove('js');
  if (!page.classList.length) page.removeAttribute('class');
  const titleEl = page.querySelector('title');
  if (title && titleEl) titleEl.textContent = title;
  const block = document.createElement('script');
  block.type = 'application/json';
  block.id = EMBED_ID;
  block.textContent = escapeJsonForHtml(backupJson);
  const body = page.querySelector('body');
  if (!body) throw new Error('The page has no body.');
  // The readable copy goes first, so a preview shows it at the top.
  if (readable) body.prepend(readable, '\n');
  body.append(block, '\n');
  // Reading (never assigning) outerHTML is the only way to turn the copy back into a file.
  // eslint-disable-next-line no-restricted-properties -- read-only serialization of a detached copy; see ARCHITECTURE.md
  return `<!doctype html>\n${page.outerHTML}\n`;
}
