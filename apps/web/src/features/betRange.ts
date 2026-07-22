/**
 * Pure amount math for the Vista Mesa bet slider.
 * Every number here is a *round total* (raise-to), the same unit the engine and
 * `feltActions` speak — not the chips taken off the stack.
 */

import { minAggressiveAction, type AggressiveKind } from './feltActions';

export type BetRange = {
  kind: AggressiveKind;
  /** Smallest legal round total. Equals `max` when only a shove is left. */
  min: number;
  /** All-in round total. */
  max: number;
  /** The stack cannot cover the legal minimum, so the slider has one stop. */
  allInOnly: boolean;
};

export function betSliderRange(input: {
  currentBet: number;
  minRaise: number;
  bigBlind: number;
  myBetThisRound: number;
  stack: number;
}): BetRange {
  const max = Math.max(0, input.myBetThisRound + input.stack);
  const opening = minAggressiveAction({
    currentBet: input.currentBet,
    minRaise: input.minRaise,
    bigBlind: input.bigBlind,
  });
  const min = Math.min(opening.amount, max);
  return { kind: opening.kind, min, max, allInOnly: min >= max };
}

/**
 * Round total for a pot-sized (or fractional) aggression.
 * Facing a bet, a pot raise is the call plus the pot *after* calling — which is
 * why `toCall` shows up twice.
 */
export function potSizedTotal(input: {
  pot: number;
  toCall: number;
  myBetThisRound: number;
  fraction: number;
}): number {
  const pot = Math.max(0, input.pot);
  const toCall = Math.max(0, input.toCall);
  const raise = Math.floor((pot + toCall) * input.fraction);
  return Math.max(0, input.myBetThisRound + toCall + raise);
}
