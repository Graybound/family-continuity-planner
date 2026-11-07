/**
 * Notifications. Messages are written into persistent live regions declared
 * in index.html (role=status for routine updates, role=alert for errors), so
 * screen readers announce them reliably.
 */
const timers = new WeakMap<HTMLElement, number>();

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  const region = document.getElementById(kind === 'error' ? 'live-alert' : 'live-status');
  if (!region) return;
  const el = document.createElement('div');
  el.className = kind === 'error' ? 'toast error' : 'toast';
  el.textContent = message;
  while (region.firstChild) region.removeChild(region.firstChild);
  region.appendChild(el);
  const prev = timers.get(region);
  if (prev) window.clearTimeout(prev);
  timers.set(region, window.setTimeout(() => {
    if (el.parentNode === region) region.removeChild(el);
  }, kind === 'error' ? 9000 : 3500));
}
