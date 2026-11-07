import { KEYS } from '../core/storage';

export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** The theme is a device preference, stored separately from the plan (same key as v1). */
export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
  try {
    localStorage.setItem(KEYS.theme, t);
  } catch {
    // Storage unavailable; the choice lasts for this session only.
  }
}
