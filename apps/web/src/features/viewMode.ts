export type PlayViewMode = 'classic' | 'felt';

const KEY = 'poker.playViewMode';

/** Felt is the default; only an explicit stored choice opts back into the classic view. */
export function resolvePlayViewMode(stored: string | null): PlayViewMode {
  return stored === 'classic' ? 'classic' : 'felt';
}

export function loadPlayViewMode(): PlayViewMode {
  try {
    return resolvePlayViewMode(localStorage.getItem(KEY));
  } catch {
    return 'felt';
  }
}

export function savePlayViewMode(mode: PlayViewMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private browsing — the preference simply does not persist.
  }
}
