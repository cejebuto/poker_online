import type { PlayerActionName, PublicPlayer } from '@poker/shared';
import { formatChips } from './feltStats';

type HandResult = { payouts: Record<number, number>; winners: number[] };

type AutoAction = {
  seat: number;
  action: PlayerActionName;
  reason: 'timeout' | 'disconnect';
};

/** Seat as a person: avatar + name when we still know them. */
export function seatLabel(seat: number, players: readonly PublicPlayer[]): string {
  const p = players.find((x) => x.seat === seat);
  if (!p) return `asiento ${seat}`;
  return p.avatar ? `${p.avatar} ${p.displayName}` : p.displayName;
}

const label = seatLabel;

/** Human-readable outcome of a finished hand, or null when there is nothing to show. */
export function describeHandResult(
  result: HandResult,
  players: readonly PublicPlayer[],
): string | null {
  if (result.winners.length === 0) return null;

  if (result.winners.length === 1) {
    const seat = result.winners[0]!;
    const amount = result.payouts[seat] ?? 0;
    if (amount <= 0) return `Ganó ${label(seat, players)}`;
    return `Ganó ${label(seat, players)} · ${formatChips(amount)}`;
  }

  const parts = result.winners.map((seat) => {
    const amount = result.payouts[seat] ?? 0;
    return amount > 0
      ? `${label(seat, players)} ${formatChips(amount)}`
      : label(seat, players);
  });
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
