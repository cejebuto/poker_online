import type { HandPhase, HandState, PlayerInHand } from './types.js';

export function cloneState(state: HandState): HandState {
  return {
    ...state,
    deck: state.deck.map((c) => ({ ...c })),
    community: state.community.map((c) => ({ ...c })),
    burned: state.burned.map((c) => ({ ...c })),
    players: state.players.map((p) => ({
      ...p,
      holeCards: p.holeCards.map((c) => ({ ...c })),
    })),
    actedSinceAggression: [...state.actedSinceAggression],
    pots: state.pots.map((p) => ({ ...p, eligibleSeats: [...p.eligibleSeats] })),
    payouts: { ...state.payouts },
    showdownResults: state.showdownResults
      ? Object.fromEntries(
          Object.entries(state.showdownResults).map(([k, v]) => [
            k,
            { score: [...v.score], category: v.category },
          ]),
        )
      : undefined,
  };
}

export function getPlayer(state: HandState, seat: number): PlayerInHand | undefined {
  return state.players.find((p) => p.seat === seat);
}

export function activePlayers(state: HandState): PlayerInHand[] {
  return state.players.filter((p) => p.status !== 'FOLDED');
}

export function canAct(p: PlayerInHand): boolean {
  return p.status === 'ACTIVE' && p.stack > 0;
}

export function playersWhoCanAct(state: HandState): PlayerInHand[] {
  return state.players.filter(canAct);
}

/** Seats sorted ascending. */
export function seatsOf(players: readonly PlayerInHand[]): number[] {
  return players.map((p) => p.seat).sort((a, b) => a - b);
}

/**
 * Next seat at or after `fromSeat` (exclusive if exclusive=true) that matches predicate,
 * wrapping around the table order of state.players sorted by seat.
 */
export function nextSeat(
  state: HandState,
  fromSeat: number,
  predicate: (p: PlayerInHand) => boolean,
  exclusive = true,
): number | null {
  const ordered = [...state.players].sort((a, b) => a.seat - b.seat);
  if (ordered.length === 0) return null;
  const seats = ordered.map((p) => p.seat);
  let startIdx = seats.indexOf(fromSeat);
  if (startIdx < 0) {
    // fromSeat may not be a player; find first seat > fromSeat
    startIdx = seats.findIndex((s) => s > fromSeat);
    if (startIdx < 0) startIdx = 0;
    exclusive = false;
  }
  const n = ordered.length;
  for (let step = exclusive ? 1 : 0; step < n + (exclusive ? 0 : 1); step++) {
    const idx = (startIdx + step) % n;
    const p = ordered[idx]!;
    if (predicate(p)) return p.seat;
  }
  return null;
}

export function isBettingPhase(phase: HandPhase): boolean {
  return phase === 'PREFLOP' || phase === 'FLOP' || phase === 'TURN' || phase === 'RIVER';
}

export function nextStreet(phase: HandPhase): HandPhase | null {
  switch (phase) {
    case 'PREFLOP':
      return 'FLOP';
    case 'FLOP':
      return 'TURN';
    case 'TURN':
      return 'RIVER';
    case 'RIVER':
      return 'SHOWDOWN';
    default:
      return null;
  }
}

/** First to act postflop: left of button among those who can act. Preflop: left of BB. */
export function firstToActSeat(state: HandState, phase: HandPhase): number | null {
  const can = (p: PlayerInHand) => canAct(p);
  if (phase === 'PREFLOP') {
    const seats = seatsOf(state.players);
    const n = seats.length;
    if (n === 2) {
      // Heads-up: button/SB acts first preflop
      return canAct(getPlayer(state, state.button)!) ? state.button : nextSeat(state, state.button, can);
    }
    const bb = bigBlindSeat(state);
    return nextSeat(state, bb, can);
  }
  // Postflop: left of button
  return nextSeat(state, state.button, can);
}

export function smallBlindSeat(state: HandState): number {
  const seats = seatsOf(state.players);
  if (seats.length === 2) {
    return state.button; // heads-up: button is SB
  }
  return nextSeat(state, state.button, () => true)!;
}

export function bigBlindSeat(state: HandState): number {
  const sb = smallBlindSeat(state);
  return nextSeat(state, sb, () => true)!;
}
