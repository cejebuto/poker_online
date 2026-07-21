import { cardCode, RANKS, SUITS } from '@poker/shared';

/** Expected asset keys: 52 faces + back (AS, 10H, back, …). */
export function expectedAssetKeys(): string[] {
  const keys: string[] = ['back'];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      keys.push(cardCode({ rank, suit }));
    }
  }
  return keys;
}

export function normalizeAssetCode(raw: string): string | null {
  const u = raw.toUpperCase();
  if (u === 'BACK') return 'back';
  let rank: string;
  let suit: string;
  if (u.startsWith('10')) {
    rank = '10';
    suit = u.slice(2);
  } else if (u[0] === 'T') {
    rank = '10';
    suit = u.slice(1);
  } else {
    rank = u[0] ?? '';
    suit = u.slice(1);
  }
  if (!rank || !suit) return null;
  const rankOk = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].includes(rank);
  const suitOk = ['C', 'D', 'H', 'S'].includes(suit);
  if (!rankOk || !suitOk) return null;
  return `${rank}${suit}`;
}
