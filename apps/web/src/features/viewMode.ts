export type PlayViewMode = 'classic' | 'felt';

const KEY = 'poker.playViewMode';

export function loadPlayViewMode(): PlayViewMode {
  try {
    return localStorage.getItem(KEY) === 'felt' ? 'felt' : 'classic';
  } catch {
    return 'classic';
  }
}

export function savePlayViewMode(mode: PlayViewMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private browsing — the preference simply does not persist.
  }
}
