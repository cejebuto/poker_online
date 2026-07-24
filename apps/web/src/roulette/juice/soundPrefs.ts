/** Roulette mute is independent of poker (`poker.sfxMuted`). */
const KEY = 'roulette.sfxMuted';

/** Default: sound ON (muted = false). */
export function loadRouletteSfxMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveRouletteSfxMuted(muted: boolean): void {
  try {
    localStorage.setItem(KEY, muted ? '1' : '0');
  } catch {
    // private mode / blocked storage
  }
}

let snapshot = typeof localStorage !== 'undefined' ? loadRouletteSfxMuted() : false;
const listeners = new Set<() => void>();

export function getRouletteSfxMuted(): boolean {
  return snapshot;
}

export function setRouletteSfxMuted(muted: boolean): void {
  if (snapshot === muted) return;
  snapshot = muted;
  saveRouletteSfxMuted(muted);
  for (const l of listeners) l();
}

export function subscribeRouletteSfxMuted(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
