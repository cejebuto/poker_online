/**
 * Seat geometry for the shared-screen table.
 *
 * One ellipse formula covers every table size (2 to 9), so there is no per-count
 * lookup table to keep in sync. Percentages, not pixels: the oval scales from a
 * tablet to a TV without touching this file.
 */

import type { PublicPlayer } from '@poker/shared';

export type RingPoint = { xPct: number; yPct: number };

/**
 * Ellipse radii as a share of the table box. Kept short of the rim on purpose:
 * a seat is centered on its point, so half a pill has to fit past it.
 */
const RX = 41;
const RY = 37;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Points around the rim, index 0 at the bottom center — the side the person
 * looking at the screen sits on — then clockwise.
 *
 * `scale` pulls the whole ring toward the middle: 1 is the seat ring, and a
 * smaller value lands between the seats and the board, which is where the dealer
 * button sits on a real table.
 */
export function seatRingPositions(count: number, scale = 1): RingPoint[] {
  if (!Number.isFinite(count) || count <= 0) return [];

  return Array.from({ length: Math.floor(count) }, (_, i) => {
    const theta = Math.PI / 2 - (2 * Math.PI * i) / count;
    return {
      xPct: round(50 + RX * scale * Math.cos(theta)),
      yPct: round(50 + RY * scale * Math.sin(theta)),
    };
  });
}

/** Everyone actually sitting at the table, in seat order. */
export function orderedTableSeats(players: readonly PublicPlayer[]): PublicPlayer[] {
  return players
    .filter((p) => p.role !== 'mesa' && p.seat !== null)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
}
