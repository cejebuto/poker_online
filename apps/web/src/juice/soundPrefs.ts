/** Client sound mute preference — pure helpers + localStorage IO. */

const KEY = 'poker.sfxMuted';

/** Default: sound ON (muted = false). */
export function resolveSfxMuted(stored: string | null): boolean {
  return stored === '1' || stored === 'true';
}

export function loadSfxMuted(): boolean {
  try {
    return resolveSfxMuted(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function saveSfxMuted(muted: boolean): void {
  try {
    localStorage.setItem(KEY, muted ? '1' : '0');
  } catch {
    // Private browsing — preference does not persist.
  }
}
