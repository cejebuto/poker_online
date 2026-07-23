/**
 * When each community card turns over.
 *
 * A flop landing as one block reads as a state change; the same three cards
 * turning 160ms apart read as a dealer working. Only the cards that are new
 * since the last render animate — the turn must not re-flip the flop.
 */

export const REVEAL_STAGGER_MS = 160;

/**
 * @returns one entry per visible card: milliseconds to wait before turning it
 *          over, or `null` when it was already face up and must not move.
 */
export function revealDelays(
  prevCount: number,
  nextCount: number,
  staggerMs: number = REVEAL_STAGGER_MS,
): (number | null)[] {
  const shown = Math.max(0, Math.min(prevCount, nextCount));
  const total = Math.max(0, nextCount);
  return Array.from({ length: total }, (_, i) =>
    i < shown ? null : (i - shown) * staggerMs,
  );
}
