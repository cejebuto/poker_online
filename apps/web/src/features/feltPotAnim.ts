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
  /**
   * Where this pot goes: `magnet` to my own stack, `seat` to another player's
   * seat, `vanish` only when nobody can be found to hand it to.
   */
  outcome: 'magnet' | 'seat' | 'vanish';
  /** Seat the chips fly to, when it is not mine. */
  toSeat: number | null;
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
 * Decide where every pot flies, from the local hero's point of view.
 * - Won + eligible (or empty eligibility) → magnet, to my own stack
 * - Otherwise → the seat of the winner who took that pot
 * - Nobody eligible / empty pot → vanish
 */
export function buildPotFlights(input: {
  pots: readonly PublicPotLike[];
  potTotal: number;
  mySeat: number | null;
  winners: readonly number[];
  myPayout: number;
  /** Used to pick which winner a shared pot flies to. */
  payouts?: Record<number, number>;
}): PotFlight[] {
  const list = resolvePotList(input.pots, input.potTotal);
  const iWon = input.mySeat !== null && input.myPayout > 0;

  const raw: PotFlight[] = list.map((p, i) => {
    const eligible =
      p.eligibleSeats.length === 0 ||
      (input.mySeat !== null && p.eligibleSeats.includes(input.mySeat));

    let outcome: PotFlight['outcome'] = 'vanish';
    let toSeat: number | null = null;

    if (p.amount > 0) {
      if (iWon && eligible) {
        outcome = 'magnet';
        toSeat = input.mySeat;
      } else {
        const winner = potWinnerSeat(p, input.winners, input.payouts);
        if (winner !== null) {
          outcome = 'seat';
          toSeat = winner;
        }
      }
    }

    return {
      key: `pot-${i}`,
      label: potLabel(i),
      amount: p.amount,
      outcome,
      toSeat,
      credit: 0,
    };
  });

  return assignPayoutCredits(raw, input.myPayout);
}

/**
 * Which seat takes this pot. A split goes to whoever was paid most (lowest
 * seat breaks the tie) — one destination reads better than chips forking
 * mid-air, and the seat pills already announce the split in text.
 */
export function potWinnerSeat(
  pot: PublicPotLike,
  winners: readonly number[],
  payouts?: Record<number, number>,
): number | null {
  const eligible = winners.filter(
    (seat) => pot.eligibleSeats.length === 0 || pot.eligibleSeats.includes(seat),
  );
  if (eligible.length === 0) return null;

  return eligible.reduce((best, seat) => {
    const bestPay = payouts?.[best] ?? 0;
    const seatPay = payouts?.[seat] ?? 0;
    if (seatPay > bestPay) return seat;
    if (seatPay === bestPay && seat < best) return seat;
    return best;
  }, eligible[0]!);
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
