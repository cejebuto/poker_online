import type { Card, Rank, Suit } from '@poker/shared';
import { RANKS, SUITS } from '@poker/shared';
import type { Rng } from '../rng.js';

/** Full 52-card deck in fixed order (not shuffled). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank: rank as Rank, suit: suit as Suit });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle; returns a new array (does not mutate input). */
export function shuffle(deck: readonly Card[], rng: Rng): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export type DealOptions = {
  /** Number of seats that receive hole cards. */
  seats: number;
  /** Burn a card before flop/turn/river (default true). */
  burn?: boolean;
};

export type DealResult = {
  holes: Card[][];
  community: Card[];
  remaining: Card[];
  burned: Card[];
};

/**
 * Deal 2 hole cards per seat + 5 community cards from a shuffled deck.
 * Order: hole cards seat0..n, then (burn) flop3, (burn) turn, (burn) river.
 */
export function deal(shuffledDeck: readonly Card[], options: DealOptions): DealResult {
  const { seats, burn = true } = options;
  if (seats < 2) {
    throw new Error('Need at least 2 seats to deal');
  }
  const deck = shuffledDeck.slice();
  const take = (): Card => {
    const c = deck.shift();
    if (!c) throw new Error('Deck exhausted');
    return c;
  };

  const holes: Card[][] = Array.from({ length: seats }, () => []);
  // Two rounds of one card each (standard)
  for (let round = 0; round < 2; round++) {
    for (let s = 0; s < seats; s++) {
      holes[s]!.push(take());
    }
  }

  const burned: Card[] = [];
  const community: Card[] = [];

  if (burn) burned.push(take());
  community.push(take(), take(), take()); // flop
  if (burn) burned.push(take());
  community.push(take()); // turn
  if (burn) burned.push(take());
  community.push(take()); // river

  return { holes, community, remaining: deck, burned };
}

/** Parse short codes like "As", "Td", "10H" into Card. */
export function parseCard(code: string): Card {
  const raw = code.trim().toUpperCase();
  let rank: Rank;
  let suitChar: string;
  if (raw.startsWith('10')) {
    rank = '10';
    suitChar = raw.slice(2);
  } else {
    const r = raw[0];
    if (!r) throw new Error(`Invalid card: ${code}`);
    const map: Record<string, Rank> = {
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9',
      T: '10',
      J: 'J',
      Q: 'Q',
      K: 'K',
      A: 'A',
    };
    const mapped = map[r];
    if (!mapped) throw new Error(`Invalid rank in: ${code}`);
    rank = mapped;
    suitChar = raw.slice(1);
  }
  const suitMap: Record<string, Suit> = {
    C: 'clubs',
    D: 'diamonds',
    H: 'hearts',
    S: 'spades',
  };
  const suit = suitMap[suitChar];
  if (!suit) throw new Error(`Invalid suit in: ${code}`);
  return { rank, suit };
}

export function parseCards(codes: string): Card[] {
  return codes
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseCard);
}
