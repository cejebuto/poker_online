/** Card suit identifiers. */
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

/** Card rank identifiers (Texas Hold'em). */
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

/** A single playing card. */
export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Render size for card themes (phone community cards use sm; hole cards / table use lg). */
export type CardSize = 'sm' | 'md' | 'lg';

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'] as const;

export const RANKS: readonly Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
] as const;

/** Human-readable suit symbols for default SVG theme. */
export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

/** Red suits for coloring. */
export const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'] as const;

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** Stable short code used by asset themes (e.g. AS, 10H). */
export function cardCode(card: Card): string {
  const suitLetter: Record<Suit, string> = {
    clubs: 'C',
    diamonds: 'D',
    hearts: 'H',
    spades: 'S',
  };
  return `${card.rank}${suitLetter[card.suit]}`;
}
