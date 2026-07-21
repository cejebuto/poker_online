import type { Card } from '@poker/shared';
import { createDeck } from '../cards/deck.js';
import { createSeededRng, type Rng } from '../rng.js';
import { compareHands, evaluateHand } from '../evaluator/evaluate.js';

export type EquityInput = {
  hero: readonly Card[];
  community: readonly Card[];
  /** Number of opponents still in the hand (not including hero). */
  opponents: number;
  iterations: number;
  /** Optional seed for deterministic tests. */
  seed?: number;
};

export type EquityResult = {
  wins: number;
  ties: number;
  losses: number;
  iterations: number;
  winPct: number;
  tiePct: number;
  losePct: number;
};

function cardKey(c: Card): string {
  return `${c.rank}:${c.suit}`;
}

function remainingDeck(known: readonly Card[]): Card[] {
  const used = new Set(known.map(cardKey));
  return createDeck().filter((c) => !used.has(cardKey(c)));
}

function shuffleInPlace(cards: Card[], rng: Rng): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = a;
  }
}

/**
 * Adaptive iteration count by street (perceived budget ~few hundred ms on mid phones).
 */
export function iterationsForStreet(communityCount: number, opponents: number): number {
  const base =
    communityCount >= 5 ? 1000 : communityCount === 4 ? 2000 : communityCount === 3 ? 3000 : 4500;
  return Math.min(8000, base + Math.max(0, opponents - 1) * 200);
}

/**
 * Monte Carlo equity for hero using ONLY hero hole + visible community.
 * Opponent hole cards and missing board cards are sampled randomly.
 * Never uses real opponent cards.
 */
export function estimateEquity(input: EquityInput): EquityResult {
  const hero = input.hero;
  if (hero.length !== 2) {
    throw new Error('Hero must have exactly 2 hole cards');
  }
  if (input.community.length > 5) {
    throw new Error('Community cannot exceed 5 cards');
  }
  if (input.opponents < 1) {
    return {
      wins: 0,
      ties: 0,
      losses: 0,
      iterations: 0,
      winPct: 100,
      tiePct: 0,
      losePct: 0,
    };
  }

  const rng: Rng =
    input.seed !== undefined ? createSeededRng(input.seed) : () => Math.random();

  const known = [...hero, ...input.community];
  const needBoard = 5 - input.community.length;
  const needOpp = input.opponents * 2;
  const need = needBoard + needOpp;

  let wins = 0;
  let ties = 0;
  let losses = 0;
  const n = Math.max(0, Math.floor(input.iterations));

  for (let i = 0; i < n; i++) {
    const deck = remainingDeck(known);
    if (deck.length < need) break;
    shuffleInPlace(deck, rng);

    let idx = 0;
    const boardExtra: Card[] = [];
    for (let b = 0; b < needBoard; b++) boardExtra.push(deck[idx++]!);
    const board = [...input.community, ...boardExtra];
    const heroScore = evaluateHand([...hero, ...board]).score;

    let beaten = false;
    let tied = false;
    for (let o = 0; o < input.opponents; o++) {
      const oCards = [deck[idx++]!, deck[idx++]!] as [Card, Card];
      const oppScore = evaluateHand([oCards[0], oCards[1], ...board]).score;
      const cmp = compareHands(heroScore, oppScore);
      if (cmp < 0) beaten = true;
      else if (cmp === 0) tied = true;
    }

    if (beaten) losses += 1;
    else if (tied) ties += 1;
    else wins += 1;
  }

  const iterations = wins + ties + losses;
  const denom = iterations || 1;
  return {
    wins,
    ties,
    losses,
    iterations,
    winPct: (wins / denom) * 100,
    tiePct: (ties / denom) * 100,
    losePct: (losses / denom) * 100,
  };
}

/**
 * Exact equity on the river (5 community known) vs 1 opponent by enumerating all hole combos.
 * Used to validate Monte Carlo accuracy in tests.
 */
export function exactRiverEquityVsOne(
  hero: readonly Card[],
  community: readonly Card[],
): EquityResult {
  if (hero.length !== 2 || community.length !== 5) {
    throw new Error('exactRiverEquityVsOne requires 2 hole + 5 community');
  }
  const deck = remainingDeck([...hero, ...community]);
  let wins = 0;
  let ties = 0;
  let losses = 0;
  const heroScore = evaluateHand([...hero, ...community]).score;

  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const oppScore = evaluateHand([deck[i]!, deck[j]!, ...community]).score;
      const cmp = compareHands(heroScore, oppScore);
      if (cmp > 0) wins += 1;
      else if (cmp === 0) ties += 1;
      else losses += 1;
    }
  }

  const iterations = wins + ties + losses;
  const denom = iterations || 1;
  return {
    wins,
    ties,
    losses,
    iterations,
    winPct: (wins / denom) * 100,
    tiePct: (ties / denom) * 100,
    losePct: (losses / denom) * 100,
  };
}
