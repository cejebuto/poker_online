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

/*
 * Shared store. Every `useJuice()` used to keep its own `useState(muted)`, so
 * muting from the table menu left the felt still playing until it remounted.
 * One module-level snapshot + subscribers keeps every listener in sync, and
 * gives `useSyncExternalStore` the stable getter it needs.
 */

const listeners = new Set<() => void>();
let snapshot: boolean | null = null;

/** Current mute state, read from storage once and cached. */
export function getSfxMuted(): boolean {
  if (snapshot === null) snapshot = loadSfxMuted();
  return snapshot;
}

export function subscribeSfxMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Persist + notify every subscriber. */
export function setSfxMuted(muted: boolean): void {
  if (snapshot === muted) return;
  snapshot = muted;
  saveSfxMuted(muted);
  for (const listener of listeners) listener();
}
