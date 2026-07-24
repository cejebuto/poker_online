import type { PlayerActionName, PublicPlayer } from '@poker/shared';

const grouped = new Intl.NumberFormat('es-AR');

/** Chip amounts on the felt read as money. Grouping matches the rest of the app. */
export function formatChips(amount: number): string {
  return `$${grouped.format(amount)}`;
}

/**
 * Pot odds as `pot:call`. Null when checking is free — a ratio against zero
 * would be meaningless, not infinite.
 */
export function potOdds(pot: number, toCall: number): string | null {
  if (toCall <= 0) return null;
  return `${(pot / toCall).toFixed(1)}:1`;
}

const OUT_OF_HAND = new Set(['FOLDED', 'SITTING_OUT', 'ELIMINATED']);
const OFF_TABLE = new Set(['SITTING_OUT', 'ELIMINATED']);

/** How many players are still contesting the pot, against how many hold a seat. */
export function handCounts(players: readonly PublicPlayer[]): {
  inHand: number;
  seated: number;
} {
  const atTable = players.filter((p) => p.role !== 'mesa' && p.seat !== null);
  return {
    inHand: atTable.filter((p) => !p.status || !OUT_OF_HAND.has(p.status)).length,
    seated: atTable.filter((p) => !p.status || !OFF_TABLE.has(p.status)).length,
  };
}

const ACTION_LABEL: Record<PlayerActionName, string> = {
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
  'all-in': 'All-in',
};

export function describeAction(action: PlayerActionName, amount: number): string {
  const label = ACTION_LABEL[action];
  return amount > 0 ? `${label} ${formatChips(amount)}` : label;
}

/** Just the verb ("Check", "Raise", "All-in") — for the floating action badge. */
export function actionLabel(action: PlayerActionName): string {
  return ACTION_LABEL[action];
}

/**
 * The pot as chips already collected in the center: total committed minus what
 * is still sitting in front of players this betting round. Those live bets ride
 * beside each seat until the street changes and they sweep in, so the center
 * number must not double-count them. Never negative.
 */
export function collectedPot(potTotal: number, players: readonly PublicPlayer[]): number {
  const live = players.reduce((sum, p) => sum + (p.betThisRound ?? 0), 0);
  return Math.max(0, potTotal - live);
}

export function streetLabel(phase: string | undefined): string {
  return phase ?? '—';
}
