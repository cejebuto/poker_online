import type { Pocket } from './wheel.js';
import { columnOf, dozenOf, isHigh, isLow } from './wheel.js';
import type { Bet } from './bets.js';
import { payoutMultiplier } from './bets.js';

/**
 * Does this bet win against the pocket the ball landed in? On an American wheel
 * both green zeroes (0 and 00) have no number, so every outside bet loses to
 * them — only a matching straight-up bet on that zero pays.
 */
export function betWins(bet: Bet, w: Pocket): boolean {
  switch (bet.kind) {
    case 'straight':
      return w.key === bet.pocket;
    case 'red':
      return w.color === 'red';
    case 'black':
      return w.color === 'black';
    case 'even':
      return w.n !== null && w.n % 2 === 0;
    case 'odd':
      return w.n !== null && w.n % 2 === 1;
    case 'low':
      return w.n !== null && isLow(w.n);
    case 'high':
      return w.n !== null && isHigh(w.n);
    case 'dozen':
      return w.n !== null && dozenOf(w.n) === bet.value;
    case 'column':
      return w.n !== null && columnOf(w.n) === bet.value;
  }
}

/**
 * Gross chips returned for a stake (the stake itself is included in a win). The
 * caller already debited the stake when the bet was placed, so it credits back
 * exactly this amount at payout — 0 on a loss.
 */
export function resolveBet(bet: Bet, stake: number, w: Pocket): number {
  return betWins(bet, w) ? stake * (payoutMultiplier(bet.kind) + 1) : 0;
}
