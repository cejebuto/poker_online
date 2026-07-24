/**
 * Showdown read-out for Vista Mesa: who showed what, and who took it down.
 *
 * The server never ranks hands for the client — it only ships the cards once the
 * hand is COMPLETE. Ranking happens here with the same pure engine evaluator the
 * server uses, which is exactly what the equity worker already does.
 */

import { evaluateHand, HandCategory, RANK_VALUE, type HandCategoryId } from '@poker/engine';
import type { Card, PublicPlayer, Rank } from '@poker/shared';
import { formatChips } from './feltStats';
import { seatLabel } from './handResult';

export const HAND_CATEGORY_ES: Record<HandCategoryId, string> = {
  [HandCategory.HIGH_CARD]: 'Carta alta',
  [HandCategory.PAIR]: 'Par',
  [HandCategory.TWO_PAIR]: 'Doble par',
  [HandCategory.THREE_OF_A_KIND]: 'Trío',
  [HandCategory.STRAIGHT]: 'Escalera',
  [HandCategory.FLUSH]: 'Color',
  [HandCategory.FULL_HOUSE]: 'Full',
  [HandCategory.FOUR_OF_A_KIND]: 'Póker',
  [HandCategory.STRAIGHT_FLUSH]: 'Escalera de color',
  [HandCategory.ROYAL_FLUSH]: 'Escalera real',
};

/** Ranks in the five-card hand, grouped by count then by strength. */
function rankGroups(best: readonly Card[]): { rank: Rank; count: number }[] {
  const counts = new Map<Rank, number>();
  for (const c of best) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
}

function highestRank(best: readonly Card[]): Rank {
  const ranks = best.map((c) => c.rank);
  return ranks.reduce((hi, r) => (RANK_VALUE[r] > RANK_VALUE[hi] ? r : hi), ranks[0]!);
}

/** Top card of a straight — A-2-3-4-5 is a five-high wheel, not ace-high. */
function straightTop(best: readonly Card[]): Rank {
  const ranks = best.map((c) => c.rank);
  if (ranks.includes('A') && ranks.includes('2')) return '5';
  return highestRank(best);
}

/**
 * The hand said out loud: "Par de Q", not just "Par".
 * Two players showing a bare "Par" cannot tell why one of them won.
 */
export function describeHandName(best: readonly Card[]): string {
  const evaluated = evaluateHand(best);
  const base = HAND_CATEGORY_ES[evaluated.category];
  const groups = rankGroups(best);
  const top = groups[0]?.rank;
  const second = groups[1]?.rank;

  switch (evaluated.category) {
    case HandCategory.ROYAL_FLUSH:
      return base;
    case HandCategory.STRAIGHT_FLUSH:
    case HandCategory.STRAIGHT:
      return `${base} al ${straightTop(best)}`;
    case HandCategory.FOUR_OF_A_KIND:
    case HandCategory.THREE_OF_A_KIND:
    case HandCategory.PAIR:
      return `${base} de ${top}`;
    case HandCategory.FULL_HOUSE:
      return `${base} de ${top} con ${second}`;
    case HandCategory.TWO_PAIR:
      return `${base} ${top} y ${second}`;
    case HandCategory.FLUSH:
      return `${base} al ${highestRank(best)}`;
    default:
      return `${base} ${highestRank(best)}`;
  }
}

/**
 * What I am holding right now, board included. Null when there is nothing to
 * read yet.
 *
 * Preflop the evaluator cannot help (it needs five cards), so the two hole cards
 * are read on their own — a pocket pair is a pair, anything else is its high card.
 */
export function describeMyHand(
  hole: readonly Card[] | undefined,
  community: readonly Card[],
): string | null {
  if (!hole || hole.length < 2) return null;

  const all = [...hole, ...community];
  if (all.length >= 5) {
    try {
      return describeHandName(evaluateHand(all).cards);
    } catch {
      return null;
    }
  }

  const [a, b] = hole;
  if (a!.rank === b!.rank) return `${HAND_CATEGORY_ES[HandCategory.PAIR]} de ${a!.rank}`;
  return `${HAND_CATEGORY_ES[HandCategory.HIGH_CARD]} ${highestRank(hole)}`;
}

export type HandResultLike = {
  payouts: Record<number, number>;
  winners: number[];
};

export type ShowdownRow = {
  seat: number;
  name: string;
  avatar?: string;
  /** The two hole cards this player turned over. */
  cards: Card[];
  /** The five cards that actually make the hand. */
  best: Card[];
  categoryLabel: string;
  payout: number;
  isWinner: boolean;
};

/**
 * One row per player who reached the end, winners first.
 * Returns [] when the cards cannot be ranked yet (short board) — a half-dealt
 * showdown is a bug elsewhere, not something to crash the table over.
 */
export function buildShowdownRows(input: {
  showdown: readonly { seat: number; cards: Card[] }[];
  community: readonly Card[];
  players: readonly PublicPlayer[];
  result: HandResultLike;
}): ShowdownRow[] {
  const rows: ShowdownRow[] = [];

  for (const entry of input.showdown) {
    const all = [...entry.cards, ...input.community];
    if (all.length < 5 || all.length > 7) return [];

    let evaluated;
    try {
      evaluated = evaluateHand(all);
    } catch {
      return [];
    }

    const player = input.players.find((p) => p.seat === entry.seat);
    rows.push({
      seat: entry.seat,
      name: player?.displayName ?? `Asiento ${entry.seat}`,
      ...(player?.avatar ? { avatar: player.avatar } : {}),
      cards: entry.cards,
      best: evaluated.cards,
      categoryLabel: describeHandName(evaluated.cards),
      payout: input.result.payouts[entry.seat] ?? 0,
      isWinner: input.result.winners.includes(entry.seat),
    });
  }

  return rows.sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    if (a.payout !== b.payout) return b.payout - a.payout;
    return a.seat - b.seat;
  });
}

/** Headline above the showdown: winner, amount, and the hand that did it. */
export function describeWinnerHeadline(
  rows: readonly ShowdownRow[],
  result: HandResultLike,
  players: readonly PublicPlayer[],
): string {
  if (result.winners.length === 0) return '';

  if (result.winners.length === 1) {
    const seat = result.winners[0]!;
    const amount = result.payouts[seat] ?? 0;
    const hand = rows.find((r) => r.seat === seat)?.categoryLabel ?? 'sin showdown';
    if (amount <= 0) return `Ganó ${seatLabel(seat, players)} · ${hand}`;
    return `Ganó ${seatLabel(seat, players)} · ${formatChips(amount)} · ${hand}`;
  }

  const parts = result.winners.map((seat) => {
    const amount = result.payouts[seat] ?? 0;
    const hand = rows.find((r) => r.seat === seat)?.categoryLabel;
    const name = seatLabel(seat, players);
    if (amount <= 0) return hand ? `${name} (${hand})` : name;
    const amt = formatChips(amount);
    return hand ? `${name} ${amt} (${hand})` : `${name} ${amt}`;
  });
  return `Bote dividido: ${parts.join(' · ')}`;
}
