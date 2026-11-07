/**
 * Minimal DOM builder. All text goes through text nodes, never through HTML
 * parsing, so user data cannot inject markup or scripts. This replaces the
 * template strings plus innerHTML used by the v1 app.
 */

export type Child = Node | string | number | false | null | undefined | Child[];

type Handler = (e: Event) => void;

export interface Props {
  class?: string | (string | false | null | undefined)[];
  /** DOM properties set directly, for example value, checked, disabled, hidden, type. */
  props?: Record<string, unknown>;
  /** Attributes set with setAttribute. Event handler attributes are rejected. */
  attrs?: Record<string, string | number | boolean | null | undefined>;
  on?: Record<string, Handler>;
  /** CSS custom properties or style properties, applied through CSSOM (allowed by the CSP). */
  style?: Record<string, string>;
  dataset?: Record<string, string>;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, p?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (p) {
    if (p.class) el.className = Array.isArray(p.class) ? p.class.filter(Boolean).join(' ') : p.class;
    if (p.attrs) {
      for (const [k, v] of Object.entries(p.attrs)) {
        if (/^on/i.test(k)) throw new Error(`Refusing to set event handler attribute ${k}`);
        if (v === null || v === undefined || v === false) continue;
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    if (p.props) for (const [k, v] of Object.entries(p.props)) (el as unknown as Record<string, unknown>)[k] = v;
    if (p.dataset) for (const [k, v] of Object.entries(p.dataset)) el.dataset[k] = v;
    if (p.style) for (const [k, v] of Object.entries(p.style)) el.style.setProperty(k, v);
    if (p.on) for (const [k, fn] of Object.entries(p.on)) el.addEventListener(k, fn);
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else if (c instanceof Node) parent.appendChild(c);
    else parent.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Decorative glyph hidden from screen readers. */
export function icon(glyph: string, cls = 'icon'): HTMLSpanElement {
  return h('span', { class: cls, attrs: { 'aria-hidden': 'true' } }, glyph);
}

/** Text that is replaced with a neutral placeholder in privacy mode, so it is not in the page at all. */
export function maybePrivate(text: string, isPrivate: boolean, privacyOn: boolean): HTMLElement {
  if (isPrivate && privacyOn) return h('span', { class: 'private-mask' }, 'Hidden while privacy mode is on');
  return h('span', { class: 'multiline' }, text);
}

let uidCounter = 0;
export function domId(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

/**
 * Focus restoration across re-renders. Interactive elements carry a stable
 * data-focus-key. Before re-rendering, remember the focused key (and caret);
 * afterwards, focus the element with the same key if it still exists.
 */
export function captureFocus(): { key: string; start: number | null; end: number | null } | null {
  const a = document.activeElement as HTMLElement | null;
  const key = a?.dataset?.focusKey;
  if (!key) return null;
  const input = a as HTMLInputElement;
  let start: number | null = null;
  let end: number | null = null;
  try {
    start = input.selectionStart ?? null;
    end = input.selectionEnd ?? null;
  } catch {
    // Some input types (checkbox, date) do not support selection.
  }
  return { key, start, end };
}

export function restoreFocus(saved: ReturnType<typeof captureFocus>, root: ParentNode = document): boolean {
  if (!saved) return false;
  const el = root.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(saved.key)}"]`);
  if (!el) return false;
  el.focus({ preventScroll: true });
  if (saved.start !== null && 'setSelectionRange' in el) {
    try {
      (el as HTMLInputElement).setSelectionRange(saved.start, saved.end ?? saved.start);
    } catch {
      // Ignore inputs that do not support selection.
    }
  }
  return true;
}
