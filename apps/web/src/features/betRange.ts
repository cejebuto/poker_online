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

/** Vertical pyramid: top = all-in, bottom = min. */
export type BetSliderSide = 'left' | 'right';

const SIDE_KEY = 'poker.betSliderSide';

export function loadBetSliderSide(): BetSliderSide {
  try {
    return localStorage.getItem(SIDE_KEY) === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
}

export function saveBetSliderSide(side: BetSliderSide): void {
  try {
    localStorage.setItem(SIDE_KEY, side);
  } catch {
    // private mode
  }
}

/** Chip step for the bet rail and custom amount: 0.1K. */
export const BET_CHIP_STEP = 100;

/**
 * Floor a round total onto 0.1K steps. Min and max (all-in) stay reachable
 * even when they are not multiples of the step (e.g. 2148 → 2100).
 */
export function snapBetAmount(
  amount: number,
  min: number,
  max: number,
  step: number = BET_CHIP_STEP,
): number {
  if (max <= min) return max;
  if (amount >= max) return max;
  if (amount <= min) return min;
  const snapped = Math.floor(amount / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/**
 * Map a Y position on the vertical track to a round total.
 * Top of the track → max (all-in); bottom → min. Snaps to 0.1K steps.
 */
export function amountFromSliderY(input: {
  clientY: number;
  trackTop: number;
  trackHeight: number;
  min: number;
  max: number;
  step?: number;
}): number {
  if (input.trackHeight <= 0 || input.max <= input.min) return input.max;
  const fromTop = (input.clientY - input.trackTop) / input.trackHeight;
  const t = 1 - Math.min(1, Math.max(0, fromTop));
  const raw = input.min + t * (input.max - input.min);
  return snapBetAmount(raw, input.min, input.max, input.step ?? BET_CHIP_STEP);
}

/** 0 at min (bottom), 1 at all-in (top). */
export function sliderFillRatio(amount: number, min: number, max: number): number {
  if (max <= min) return 1;
  return Math.min(1, Math.max(0, (amount - min) / (max - min)));
}

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
