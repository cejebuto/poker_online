import type { Card } from '@poker/shared';
import { RANK_VALUE } from '../cards/values.js';

/** Hand categories from high card (0) to royal flush (9). */
export const HandCategory = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
} as const;

export type HandCategoryId = (typeof HandCategory)[keyof typeof HandCategory];

/**
 * Comparable score: first element is category, then kickers descending.
 * Lexicographic compare of arrays is sufficient.
 */
export type HandScore = readonly number[];

export type EvaluatedHand = {
  score: HandScore;
  category: HandCategoryId;
  /** The 5 cards that form the hand (from the best combination). */
  cards: Card[];
};

function cardValue(c: Card): number {
  return RANK_VALUE[c.rank];
}

/** All combinations of k items from array. */
function combinations<T>(arr: readonly T[], k: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;
  if (k > n || k <= 0) return result;

  const idxs = Array.from({ length: k }, (_, i) => i);
  const pick = (): T[] => idxs.map((i) => arr[i]!);

  result.push(pick());
  let more = true;
  while (more) {
    let i = k - 1;
    while (i >= 0 && idxs[i] === i + n - k) i--;
    if (i < 0) {
      more = false;
    } else {
      idxs[i]!++;
      for (let j = i + 1; j < k; j++) {
        idxs[j] = idxs[j - 1]! + 1;
      }
      result.push(pick());
    }
  }
  return result;
}

function compareScores(a: HandScore, b: HandScore): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** Score a fixed 5-card hand. */
export function scoreFive(cards: readonly Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error('scoreFive expects exactly 5 cards');
  }
  const values = cards.map(cardValue).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // Rank counts
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const byCount = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  // Straight detection (incl. wheel A-2-3-4-5)
  const unique = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0]! - unique[4]! === 4) {
      straightHigh = unique[0]!;
    } else if (
      unique[0] === 14 &&
      unique[1] === 5 &&
      unique[2] === 4 &&
      unique[3] === 3 &&
      unique[4] === 2
    ) {
      straightHigh = 5; // wheel: 5-high straight
    }
  }
  // Also handle 5 unique from multi? for five cards unique.length===5 covers all
  const isStraight = straightHigh > 0;

  if (isStraight && isFlush) {
    if (straightHigh === 14) {
      return {
        score: [HandCategory.ROYAL_FLUSH],
        category: HandCategory.ROYAL_FLUSH,
        cards: [...cards],
      };
    }
    return {
      score: [HandCategory.STRAIGHT_FLUSH, straightHigh],
      category: HandCategory.STRAIGHT_FLUSH,
      cards: [...cards],
    };
  }

  const c0 = byCount[0]!;
  const c1 = byCount[1];

  if (c0[1] === 4) {
    const kicker = byCount[1]![0];
    return {
      score: [HandCategory.FOUR_OF_A_KIND, c0[0], kicker],
      category: HandCategory.FOUR_OF_A_KIND,
      cards: [...cards],
    };
  }

  if (c0[1] === 3 && c1 && c1[1] === 2) {
    return {
      score: [HandCategory.FULL_HOUSE, c0[0], c1[0]],
      category: HandCategory.FULL_HOUSE,
      cards: [...cards],
    };
  }

  if (isFlush) {
    return {
      score: [HandCategory.FLUSH, ...values],
      category: HandCategory.FLUSH,
      cards: [...cards],
    };
  }

  if (isStraight) {
    return {
      score: [HandCategory.STRAIGHT, straightHigh],
      category: HandCategory.STRAIGHT,
      cards: [...cards],
    };
  }

  if (c0[1] === 3) {
    const kickers = byCount.slice(1).map((x) => x[0]);
    return {
      score: [HandCategory.THREE_OF_A_KIND, c0[0], ...kickers],
      category: HandCategory.THREE_OF_A_KIND,
      cards: [...cards],
    };
  }

  if (c0[1] === 2 && c1 && c1[1] === 2) {
    const highPair = Math.max(c0[0], c1[0]);
    const lowPair = Math.min(c0[0], c1[0]);
    const kicker = byCount[2]![0];
    return {
      score: [HandCategory.TWO_PAIR, highPair, lowPair, kicker],
      category: HandCategory.TWO_PAIR,
      cards: [...cards],
    };
  }

  if (c0[1] === 2) {
    const kickers = byCount.slice(1).map((x) => x[0]);
    return {
      score: [HandCategory.PAIR, c0[0], ...kickers],
      category: HandCategory.PAIR,
      cards: [...cards],
    };
  }

  return {
    score: [HandCategory.HIGH_CARD, ...values],
    category: HandCategory.HIGH_CARD,
    cards: [...cards],
  };
}

/** Best 5-card hand from 5–7 cards. */
export function evaluateHand(cards: readonly Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand expects 5–7 cards, got ${cards.length}`);
  }
  if (cards.length === 5) {
    return scoreFive(cards);
  }
  let best: EvaluatedHand | null = null;
  for (const five of combinations(cards, 5)) {
    const ev = scoreFive(five);
    if (!best || compareScores(ev.score, best.score) > 0) {
      best = ev;
    }
  }
  return best!;
}

export function compareHands(a: HandScore, b: HandScore): number {
  return compareScores(a, b);
}

export type ShowdownPlayer = {
  seat: number;
  cards: readonly Card[]; // hole + community already combined, or hole only
};

/**
 * Among players with hole cards + shared community, find winner seat(s).
 * `community` is shared; each player provides 2 hole cards.
 */
export function findWinners(
  players: readonly { seat: number; hole: readonly Card[] }[],
  community: readonly Card[],
): { seats: number[]; evaluation: Map<number, EvaluatedHand> } {
  const evaluation = new Map<number, EvaluatedHand>();
  let bestScore: HandScore | null = null;
  const winners: number[] = [];

  for (const p of players) {
    const all = [...p.hole, ...community];
    const ev = evaluateHand(all);
    evaluation.set(p.seat, ev);
    if (!bestScore || compareScores(ev.score, bestScore) > 0) {
      bestScore = ev.score;
      winners.length = 0;
      winners.push(p.seat);
    } else if (compareScores(ev.score, bestScore) === 0) {
      winners.push(p.seat);
    }
  }

  return { seats: winners, evaluation };
}
