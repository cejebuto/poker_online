/** Tunable knobs for the single roulette table. */

export const ROULETTE = {
  /** Fresh players (and top-ups) start here. */
  startingBalance: 10_000_000,
  /** Chip denominations offered on the rail (0.1K … 10M via K/M formatting). */
  chips: [1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const,
  minBet: 1_000,
  /** Phase lengths (ms). Betting → spinning → payout → next betting. */
  bettingMs: 15_000,
  spinningMs: 6_500,
  payoutMs: 4_000,
  /** How many past results to keep for the history strip. */
  historyLen: 14,
} as const;
