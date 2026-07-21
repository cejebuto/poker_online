/**
 * Pure helpers for Vista Mesa action-bar amounts.
 * Engine raise amount = total betThisRound after the raise (raise-to), not the raise size.
 */

export type AggressiveKind = 'bet' | 'raise';

export type AggressiveAction = {
  kind: AggressiveKind;
  /** For bet: chips to put in. For raise: total chips this round (raise-to). */
  amount: number;
};

/** Opening bet uses BB; once money is in, aggression is a raise-to. */
export function minAggressiveAction(input: {
  currentBet: number;
  minRaise: number;
  bigBlind: number;
}): AggressiveAction {
  const bb = Math.max(1, input.bigBlind);
  if (input.currentBet <= 0) {
    return { kind: 'bet', amount: bb };
  }
  const minRaise = Math.max(1, input.minRaise);
  return { kind: 'raise', amount: input.currentBet + minRaise };
}

/**
 * x3: triple the big blind when no bet is open; otherwise 3× the current highest bet
 * (as a raise-to total this round).
 */
export function tripleTargetAmount(input: {
  currentBet: number;
  bigBlind: number;
}): AggressiveAction {
  const bb = Math.max(1, input.bigBlind);
  if (input.currentBet <= 0) {
    return { kind: 'bet', amount: bb * 3 };
  }
  return { kind: 'raise', amount: input.currentBet * 3 };
}

/** Extra chips needed from stack to reach `totalThisRound`. */
export function chipsToReach(totalThisRound: number, myBetThisRound: number): number {
  return Math.max(0, totalThisRound - myBetThisRound);
}

export function canAffordTotal(
  stack: number,
  myBetThisRound: number,
  totalThisRound: number,
): boolean {
  if (totalThisRound <= 0) return false;
  return chipsToReach(totalThisRound, myBetThisRound) <= stack;
}

/** When facing a bet, the primary passive button is fold; otherwise check. */
export function passiveAction(toCall: number): 'check' | 'fold' {
  return toCall > 0 ? 'fold' : 'check';
}
