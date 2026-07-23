/**
 * Pure planning for flying chips — betting into the pot, and the pot coming
 * back out to a winner.
 *
 * Two jobs, both deterministic so they can be tested without a DOM:
 *  - turn an amount into a short line of chip tokens (which denominations, in
 *    what order, with what stagger),
 *  - spot who just put chips in, by diffing the room state instead of listening
 *    for `player:acted`. The diff also covers blinds, auto-folds and snapshots
 *    after a reconnect, which an event listener would miss.
 */

import { breakIntoChips, CHIP_COLORS, type ChipDenom } from '../chips/denominations';

export type ChipToken = {
  denom: ChipDenom;
  face: string;
  edge: string;
  rim: string;
  /** Milliseconds after the flight starts. */
  delayMs: number;
  /** -1..1 lateral scatter, so the line reads as thrown chips, not as a ray. */
  spread: number;
  /** Degrees of rotation over the flight. */
  spin: number;
};

/** A line longer than this stops reading as chips and starts costing frames. */
export const MAX_CHIP_TOKENS = 12;

export const DEFAULT_STAGGER_MS = 70;

export type PlanChipOptions = {
  max?: number;
  staggerMs?: number;
};

/**
 * Break an amount into at most `max` chip tokens.
 *
 * Small amounts get one token per real chip. Big ones keep the *mix*: each
 * denomination gets tokens proportional to its share of the value, so an
 * all-in still shows its purple and orange chips instead of 12 white ones.
 */
export function planChipTokens(amount: number, opts: PlanChipOptions = {}): ChipToken[] {
  const total = Math.max(0, Math.floor(amount));
  if (total <= 0) return [];

  const max = Math.max(1, opts.max ?? MAX_CHIP_TOKENS);
  const staggerMs = opts.staggerMs ?? DEFAULT_STAGGER_MS;
  const columns = breakIntoChips(total);
  if (columns.length === 0) return [];

  const chipCount = columns.reduce((sum, c) => sum + c.count, 0);
  const counts =
    chipCount <= max
      ? columns.map((c) => c.count)
      : allocateByValue(
          columns.map((c) => c.denom * c.count),
          max,
        );

  const tokens: ChipToken[] = [];
  let i = 0;
  for (let col = 0; col < columns.length; col++) {
    const denom = columns[col]!.denom;
    const colors = CHIP_COLORS[denom];
    for (let n = 0; n < (counts[col] ?? 0); n++) {
      tokens.push({
        denom,
        face: colors.face,
        edge: colors.edge,
        rim: colors.rim,
        delayMs: i * staggerMs,
        // Deterministic scatter — same plan every time, still looks organic.
        spread: (((i * 37) % 11) - 5) / 5,
        spin: (((i * 53) % 9) - 4) * 45,
      });
      i++;
    }
  }

  return tokens;
}

/**
 * Hand out `max` slots proportionally to each weight, largest remainder first,
 * never dropping a weight that carries value to zero while a smaller one keeps
 * a slot.
 */
function allocateByValue(weights: readonly number[], max: number): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (w / total) * max);
  const out = exact.map((n) => Math.floor(n));
  let left = max - out.reduce((sum, n) => sum + n, 0);

  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of order) {
    if (left <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    left--;
  }

  // A denomination that holds value always shows at least one chip; pay for it
  // from whoever has the most.
  for (let i = 0; i < out.length; i++) {
    if ((weights[i] ?? 0) > 0 && out[i] === 0) {
      let richest = 0;
      for (let j = 1; j < out.length; j++) {
        if ((out[j] ?? 0) > (out[richest] ?? 0)) richest = j;
      }
      if ((out[richest] ?? 0) > 1) {
        out[richest] = (out[richest] ?? 0) - 1;
        out[i] = 1;
      }
    }
  }

  return out;
}

/** When the last token of a plan has landed. */
export function totalFlightMs(tokens: readonly ChipToken[], travelMs: number): number {
  if (tokens.length === 0) return 0;
  return (tokens[tokens.length - 1]?.delayMs ?? 0) + travelMs;
}

/** Each chip in a line lands a little higher than the one before it. */
export function chipPitch(index: number): number {
  return 1 + Math.min(index, 14) * 0.045;
}

export type SeatBetLike = { seat: number | null; betThisRound?: number };

export type SeatBets = Record<number, number>;

export type SeatBetDelta = { seat: number; delta: number };

/** Chips committed this round, per seat. */
export function snapshotSeatBets(players: readonly SeatBetLike[]): SeatBets {
  const out: SeatBets = {};
  for (const p of players) {
    if (p.seat === null || p.seat === undefined) continue;
    out[p.seat] = Math.max(0, Math.floor(p.betThisRound ?? 0));
  }
  return out;
}

/**
 * Seats whose commitment grew. Drops are ignored on purpose: a street ending
 * resets every bet to zero, and that is the pot collecting, not a new bet.
 */
export function diffSeatBets(prev: SeatBets, next: SeatBets): SeatBetDelta[] {
  const deltas: SeatBetDelta[] = [];
  for (const key of Object.keys(next)) {
    const seat = Number(key);
    const delta = (next[seat] ?? 0) - (prev[seat] ?? 0);
    if (delta > 0) deltas.push({ seat, delta });
  }
  return deltas.sort((a, b) => a.seat - b.seat);
}
