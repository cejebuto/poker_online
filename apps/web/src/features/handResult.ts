import type { PlayerActionName, PublicPlayer } from '@poker/shared';

type HandResult = { payouts: Record<number, number>; winners: number[] };

type AutoAction = {
  seat: number;
  action: PlayerActionName;
  reason: 'timeout' | 'disconnect';
};

const chips = new Intl.NumberFormat('es-AR');

function label(seat: number, players: readonly PublicPlayer[]): string {
  const p = players.find((x) => x.seat === seat);
  if (!p) return `asiento ${seat}`;
  return p.avatar ? `${p.avatar} ${p.displayName}` : p.displayName;
}

/** Human-readable outcome of a finished hand, or null when there is nothing to show. */
export function describeHandResult(
  result: HandResult,
  players: readonly PublicPlayer[],
): string | null {
  if (result.winners.length === 0) return null;

  if (result.winners.length === 1) {
    const seat = result.winners[0]!;
    const amount = result.payouts[seat] ?? 0;
    const noun = amount === 1 ? 'ficha' : 'fichas';
    return `Ganó ${label(seat, players)} · ${chips.format(amount)} ${noun}`;
  }

  const parts = result.winners.map(
    (seat) => `${label(seat, players)} ${chips.format(result.payouts[seat] ?? 0)}`,
  );
  return `Bote dividido: ${parts.join(' · ')}`;
}

/**
 * Why a seat acted without the player choosing. The server sends this on timeout
 * and disconnect; without it the hand appears to end for no reason.
 */
export function describeAutoAction(
  event: AutoAction,
  players: readonly PublicPlayer[],
  mySeat: number | null,
): string {
  const suffix = `${event.action} automático`;
  if (event.seat === mySeat) {
    const cause = event.reason === 'timeout' ? 'Se te acabó el tiempo' : 'Te desconectaste';
    return `${cause} · ${suffix}`;
  }
  const cause = event.reason === 'timeout' ? 'se quedó sin tiempo' : 'se desconectó';
  return `${label(event.seat, players)} ${cause} · ${suffix}`;
}
