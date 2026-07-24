/** Bet types for the full American board: straight-up numbers plus outside bets. */

export type Bet =
  | { kind: 'straight'; pocket: string } // '0', '00', or '1'..'36'
  | { kind: 'red' }
  | { kind: 'black' }
  | { kind: 'even' }
  | { kind: 'odd' }
  | { kind: 'low' } // 1–18
  | { kind: 'high' } // 19–36
  | { kind: 'dozen'; value: 1 | 2 | 3 }
  | { kind: 'column'; value: 1 | 2 | 3 };

export type BetKind = Bet['kind'];

/** A stable string id for a board spot — the key bets are stacked under. */
export type BetSpot = string;

export function betSpotId(bet: Bet): BetSpot {
  switch (bet.kind) {
    case 'straight':
      return `straight:${bet.pocket}`;
    case 'dozen':
      return `dozen:${bet.value}`;
    case 'column':
      return `column:${bet.value}`;
    default:
      return bet.kind;
  }
}

const OUTSIDE = new Set<BetKind>(['red', 'black', 'even', 'odd', 'low', 'high']);

/** Rebuild a bet from its spot id, or null when the id is malformed. */
export function betFromSpot(spot: BetSpot): Bet | null {
  const [kind, arg] = spot.split(':');
  if (!kind) return null;
  if (kind === 'straight') return arg ? { kind: 'straight', pocket: arg } : null;
  if (kind === 'dozen' || kind === 'column') {
    const value = Number(arg);
    return value === 1 || value === 2 || value === 3 ? { kind, value } : null;
  }
  if (OUTSIDE.has(kind as BetKind)) return { kind } as Bet;
  return null;
}

/** House multiplier: straight 35:1, dozen/column 2:1, the rest even money. */
export function payoutMultiplier(kind: BetKind): number {
  if (kind === 'straight') return 35;
  if (kind === 'dozen' || kind === 'column') return 2;
  return 1;
}
