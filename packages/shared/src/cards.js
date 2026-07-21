export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = [
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
];
/** Human-readable suit symbols for default SVG theme. */
export const SUIT_SYMBOL = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
};
/** Red suits for coloring. */
export const RED_SUITS = ['hearts', 'diamonds'];
export function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}
/** Stable short code used by asset themes (e.g. AS, 10H). */
export function cardCode(card) {
    const suitLetter = {
        clubs: 'C',
        diamonds: 'D',
        hearts: 'H',
        spades: 'S',
    };
    return `${card.rank}${suitLetter[card.suit]}`;
}
//# sourceMappingURL=cards.js.map