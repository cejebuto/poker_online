/** Card suit identifiers. */
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
/** Card rank identifiers (Texas Hold'em). */
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
/** A single playing card. */
export interface Card {
    rank: Rank;
    suit: Suit;
}
/** Render size for card themes (phone community cards use sm; hole cards / table use lg). */
export type CardSize = 'sm' | 'md' | 'lg';
export declare const SUITS: readonly Suit[];
export declare const RANKS: readonly Rank[];
/** Human-readable suit symbols for default SVG theme. */
export declare const SUIT_SYMBOL: Record<Suit, string>;
/** Red suits for coloring. */
export declare const RED_SUITS: readonly Suit[];
export declare function isRedSuit(suit: Suit): boolean;
/** Stable short code used by asset themes (e.g. AS, 10H). */
export declare function cardCode(card: Card): string;
//# sourceMappingURL=cards.d.ts.map