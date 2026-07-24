/** Which side of the hero zone holds the action buttons. Default: right. */

export type HeroHandedness = 'left' | 'right';

const KEY = 'poker.heroHandedness';

/** Buttons on the right is the default (cards / stack / avatar on the left). */
export function resolveHeroHandedness(stored: string | null): HeroHandedness {
  return stored === 'left' ? 'left' : 'right';
}

export function loadHeroHandedness(): HeroHandedness {
  try {
    return resolveHeroHandedness(localStorage.getItem(KEY));
  } catch {
    return 'right';
  }
}

export function saveHeroHandedness(side: HeroHandedness): void {
  try {
    localStorage.setItem(KEY, side);
  } catch {
    // Private browsing — preference does not persist.
  }
}
