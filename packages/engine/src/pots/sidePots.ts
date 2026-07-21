export type Contribution = {
  seat: number;
  /** Total chips this player put into the pot this hand. */
  amount: number;
  /** Whether they can still win (not folded). */
  eligible: boolean;
};

export type Pot = {
  amount: number;
  eligibleSeats: number[];
};

/**
 * Build main + side pots from per-player contributions.
 * Folded players still contribute but are not eligible to win.
 */
export function buildSidePots(contributions: readonly Contribution[]): Pot[] {
  const active = contributions.filter((c) => c.amount > 0);
  if (active.length === 0) return [];

  const levels = [...new Set(active.map((c) => c.amount))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;

  for (const level of levels) {
    const contributors = active.filter((c) => c.amount >= level);
    const slice = level - prev;
    if (slice <= 0 || contributors.length === 0) {
      prev = level;
      continue;
    }
    const amount = slice * contributors.length;
    const eligibleSeats = contributors.filter((c) => c.eligible).map((c) => c.seat);
    // A pot with no eligible winners still exists (everyone folded who put money?) —
    // last non-folder wins via fold-out path; here we only include if someone is eligible.
    if (eligibleSeats.length > 0) {
      pots.push({ amount, eligibleSeats });
    } else {
      // Chips still need a home: attach to last pot or create dead pot awarded later.
      pots.push({ amount, eligibleSeats: [] });
    }
    prev = level;
  }

  return pots;
}

/**
 * Award pots to winners. `rankSeats` returns seat order best→worst for a set of eligible seats
 * (ties share the same best rank).
 * Odd chips go to seats closest to the button (clockwise from button+1 is standard;
 * we pass seats sorted by award priority for odd chips).
 *
 * @param oddChipPriority seats in order of priority for leftover chips (first gets first odd chip).
 */
export function awardPots(
  pots: readonly Pot[],
  /**
   * For a pot's eligible seats, return winning seats (ties allowed).
   */
  winnersFor: (eligibleSeats: readonly number[]) => number[],
  oddChipPriority: readonly number[],
): Map<number, number> {
  const payouts = new Map<number, number>();

  const add = (seat: number, chips: number) => {
    payouts.set(seat, (payouts.get(seat) ?? 0) + chips);
  };

  for (const pot of pots) {
    if (pot.amount <= 0) continue;
    let winners = pot.eligibleSeats.length
      ? winnersFor(pot.eligibleSeats)
      : [];
    if (winners.length === 0) {
      // Dead pot: give to first in odd-chip priority among all who contributed conceptually —
      // callers should avoid empty eligibility; fallback to first priority seat.
      const fallback = oddChipPriority[0];
      if (fallback !== undefined) winners = [fallback];
      else continue;
    }

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const w of winners) {
      add(w, share);
    }
    // Odd chips: closest to button among winners, following oddChipPriority order.
    if (remainder > 0) {
      const order = oddChipPriority.filter((s) => winners.includes(s));
      for (const seat of order) {
        if (remainder <= 0) break;
        add(seat, 1);
        remainder -= 1;
      }
    }
  }

  return payouts;
}

/** Seats ordered by odd-chip priority: first left of button, then around (button last). */
export function oddChipOrder(seats: readonly number[], button: number): number[] {
  const sorted = [...seats].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  // Start from seat after button
  const start = sorted.find((s) => s > button) ?? sorted[0]!;
  const idx = sorted.indexOf(start);
  return [...sorted.slice(idx), ...sorted.slice(0, idx)];
}
