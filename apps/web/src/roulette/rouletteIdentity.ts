/** A stable per-device id so a player keeps their balance across reconnects.
 *  Independent from the poker session — its own localStorage key. */

const KEY = 'roulette.pid';

export function rouletteId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
