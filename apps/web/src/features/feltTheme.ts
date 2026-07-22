/**
 * Table felt colors. The two stops feed the `radial-gradient` on `.felt`, which
 * already reads them as the `--felt-green` / `--felt-dark` custom properties.
 */

export type FeltTheme = {
  id: string;
  name: string;
  /** Center of the gradient. */
  green: string;
  /** Outer rail. */
  dark: string;
};

export const FELT_THEMES: readonly FeltTheme[] = [
  { id: 'green', name: 'Verde clásico', green: '#14663f', dark: '#0a3a24' },
  { id: 'blue', name: 'Azul casino', green: '#155e75', dark: '#0a3244' },
  { id: 'burgundy', name: 'Borgoña', green: '#7f1d3a', dark: '#41101f' },
  { id: 'graphite', name: 'Grafito', green: '#334155', dark: '#1a2333' },
  { id: 'midnight', name: 'Negro medianoche', green: '#1f2937', dark: '#0b0f16' },
];

export const DEFAULT_FELT_THEME_ID = 'green';

const KEY = 'poker.feltTheme';

export function resolveFeltTheme(stored: string | null): FeltTheme {
  const found = FELT_THEMES.find((t) => t.id === stored);
  return found ?? FELT_THEMES.find((t) => t.id === DEFAULT_FELT_THEME_ID)!;
}

export function loadFeltTheme(): FeltTheme {
  try {
    return resolveFeltTheme(localStorage.getItem(KEY));
  } catch {
    return resolveFeltTheme(null);
  }
}

export function saveFeltTheme(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Private browsing — the preference simply does not persist.
  }
}
