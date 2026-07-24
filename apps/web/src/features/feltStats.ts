import type { PlayerActionName, PublicPlayer } from '@poker/shared';

/**
 * Compact chip display: no currency mark, thousands → K, millions → M.
 * 500 → "0.5K", 1200 → "1.2K", 1_230_000 → "1.23M".
 */
export function formatChips(amount: number): string {
  const n = Math.trunc(amount);
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${sign}${trimCompact(abs / 1_000_000)}M`;
  }
  return `${sign}${trimCompact(abs / 1000)}K`;
}

/** Drop trailing zeros: 1.20 → "1.2", 1.00 → "1". */
function trimCompact(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Parse a create-room style amount. A bare number is **kilos**
 * ("20" → 20_000, "0.1" → 100). Explicit `K`/`M` suffixes also work.
 * Returns null when the text is empty or not a number.
 */
export function parseChipInput(raw: string): number | null {
  const text = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!text) return null;
  const m = text.match(/^(-?\d+(?:\.\d+)?)([kKmM])?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = (m[2] ?? 'k').toLowerCase();
  if (suffix === 'm') return Math.round(value * 1_000_000);
  return Math.round(value * 1000);
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
