/**
 * Relative seat layout for the player felt (max 9: hero + 8 opponents).
 *
 * Opponents are ordered clockwise starting from the seat immediately to the
 * hero's left, then split into two columns of up to 4 slots each (left / right).
 * Empty slots stay null and should not be rendered.
 */

import type { PublicPlayer } from '@poker/shared';
import { orderedTableSeats } from './seatRing.js';

export const OPPONENT_SLOTS_PER_SIDE = 4;

export type OpponentColumns<T = PublicPlayer> = {
  /** Top → bottom on the left rail (null = empty slot). */
  left: (T | null)[];
  /** Top → bottom on the right rail (null = empty slot). */
  right: (T | null)[];
};

/**
 * Seated non-mesa players rotated so `heroPlayerId` is first, then dropped.
 * Remaining order is clockwise from the seat to the hero's left.
 */
export function opponentsClockwiseFromHero(
  players: readonly PublicPlayer[],
  heroPlayerId: string,
): PublicPlayer[] {
  const seated = orderedTableSeats(players);
  if (seated.length === 0) return [];

  const heroIdx = seated.findIndex((p) => p.playerId === heroPlayerId);
  if (heroIdx < 0) {
    // Spectator / not seated: still show everyone else in seat order.
    return seated.filter((p) => p.playerId !== heroPlayerId);
  }

  const rotated = [...seated.slice(heroIdx), ...seated.slice(0, heroIdx)];
  // rotated[0] is hero; the rest walk clockwise around the table.
  return rotated.slice(1);
}

/**
 * Pack up to 4 players into a column of 4 slots, vertically centered.
 * `nearHeroFirst` true → first player sits closest to the bottom (near hero).
 */
export function placeInColumn<T>(
  players: readonly T[],
  nearHeroFirst: boolean,
): (T | null)[] {
  const slots: (T | null)[] = Array.from({ length: OPPONENT_SLOTS_PER_SIDE }, () => null);
  if (players.length === 0) return slots;

  const ordered = nearHeroFirst ? [...players].reverse() : [...players];
  const start = Math.floor((OPPONENT_SLOTS_PER_SIDE - ordered.length) / 2);
  for (let i = 0; i < ordered.length && i < OPPONENT_SLOTS_PER_SIDE; i++) {
    slots[start + i] = ordered[i]!;
  }
  return slots;
}

/**
 * Split clockwise opponents into left / right rails (max 4 each).
 *
 * - First half (ceil) → left rail; closest to hero at bottom.
 * - Second half → right rail; continues around the far side; closest to hero at bottom.
 * - More than 8 opponents are truncated (domain max is 8).
 */
export function assignOpponentSlots<T>(
  opponentsClockwise: readonly T[],
): OpponentColumns<T> {
  const capped = opponentsClockwise.slice(0, OPPONENT_SLOTS_PER_SIDE * 2);
  const mid = Math.ceil(capped.length / 2);
  const leftPlayers = capped.slice(0, mid);
  const rightPlayers = capped.slice(mid);
  return {
    left: placeInColumn(leftPlayers, true),
    right: placeInColumn(rightPlayers, false),
  };
}

/** Convenience: from full room players + hero id → column layout. */
export function layoutOpponentsForHero(
  players: readonly PublicPlayer[],
  heroPlayerId: string,
): OpponentColumns {
  return assignOpponentSlots(opponentsClockwiseFromHero(players, heroPlayerId));
}
