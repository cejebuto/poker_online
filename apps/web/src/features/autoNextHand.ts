/** Host preference: after the first hand, auto-deal the next one. Default on. */

const KEY = 'poker.autoNextHand';

/** Default true — agile table; host can turn off in the mesa menu. */
export function loadAutoNextHand(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

export function saveAutoNextHand(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Private browsing — preference does not persist.
  }
}

/** Delay before the host auto-sends hand:start between hands. */
export const AUTO_NEXT_HAND_MS = 2000;
