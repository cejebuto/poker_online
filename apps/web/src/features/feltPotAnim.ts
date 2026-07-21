/**
 * Pure pot-flight planning for Vista Mesa end-of-hand juice.
 * Engine exposes total payouts per seat; pots are main + side pots.
 */

export type PublicPotLike = {
  amount: number;
  eligibleSeats: number[];
};

export type PotFlight = {
  key: string;
  label: string;
  amount: number;
  /** Magnet toward hero stack, or vanish (lost / other winners). */
  outcome: 'magnet' | 'vanish';
  /** Share of my total payout attributed to this pot (for stack count-up). */
  credit: number;
};

export function potLabel(index: number): string {
  return index === 0 ? 'Bote principal' : `Side pot ${index}`;
}

/**
 * Build main + side pot list. If `pots` is empty but potTotal > 0 (live hand),
 * synthesize a single principal pot for display — end-of-hand should have pots.
 */
export function resolvePotList(
  pots: readonly PublicPotLike[],
  potTotal: number,
): PublicPotLike[] {
  if (pots.length > 0) {
    return pots.map((p) => ({
      amount: p.amount,
      eligibleSeats: [...p.eligibleSeats],
    }));
  }
  if (potTotal > 0) return [{ amount: potTotal, eligibleSeats: [] }];
  return [];
}

/**
 * Decide magnet vs vanish per pot for the local hero.
 * - No payout → all vanish
 * - Won + eligible (or empty eligibility) → magnet
 * - Won but not eligible for that pot → vanish (other side pot)
 */
export function buildPotFlights(input: {
  pots: readonly PublicPotLike[];
  potTotal: number;
  mySeat: number | null;
  winners: readonly number[];
  myPayout: number;
}): PotFlight[] {
  const list = resolvePotList(input.pots, input.potTotal);
  const iWon = input.mySeat !== null && input.myPayout > 0;

  const raw: PotFlight[] = list.map((p, i) => {
    const eligible =
      p.eligibleSeats.length === 0 ||
      (input.mySeat !== null && p.eligibleSeats.includes(input.mySeat));
    const outcome: PotFlight['outcome'] =
      iWon && eligible && p.amount > 0 ? 'magnet' : 'vanish';
    return {
      key: `pot-${i}`,
      label: potLabel(i),
      amount: p.amount,
      outcome,
      credit: 0,
    };
  });

  return assignPayoutCredits(raw, input.myPayout);
}

/** Split my total payout across magnet pots proportional to pot amounts. */
export function assignPayoutCredits(flights: PotFlight[], myPayout: number): PotFlight[] {
  if (myPayout <= 0) {
    return flights.map((f) => ({ ...f, credit: 0 }));
  }
  const magnetKeys = flights
    .filter((f) => f.outcome === 'magnet' && f.amount > 0)
    .map((f) => f.key);
  const magnetTotal = flights
    .filter((f) => magnetKeys.includes(f.key))
    .reduce((s, f) => s + f.amount, 0);
  if (magnetTotal <= 0 || magnetKeys.length === 0) {
    return flights.map((f) => ({ ...f, credit: 0 }));
  }

  const lastKey = magnetKeys[magnetKeys.length - 1]!;
  let assigned = 0;
  return flights.map((f) => {
    if (f.outcome !== 'magnet' || f.amount <= 0) return { ...f, credit: 0 };
    if (f.key === lastKey) {
      return { ...f, credit: myPayout - assigned };
    }
    const credit = Math.floor((myPayout * f.amount) / magnetTotal);
    assigned += credit;
    return { ...f, credit };
  });
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
