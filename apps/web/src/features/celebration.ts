/**
 * Winner celebration maths.
 *
 * The amount of confetti is measured in big blinds, not chips: $2.000 is a monster
 * at 5/10 and a rounding error at 500/1000, and the party should read the same at
 * either stake.
 */

import { createSeededRng } from '@poker/engine';

export const CONFETTI_MIN = 24;
export const CONFETTI_MAX = 160;
/** Extra pieces per big blind won. */
const PER_BIG_BLIND = 1.6;

const COLORS = ['#fbbf24', '#4ade80', '#60a5fa', '#f87171', '#f8fafc', '#c084fc'] as const;

export type ConfettiPiece = {
  id: string;
  /** Horizontal start, 0-100 across the screen. */
  xPct: number;
  delay: number;
  duration: number;
  /** Total spin in degrees. */
  rotate: number;
  /** Sideways travel in px, positive or negative. */
  drift: number;
  size: number;
  color: string;
};

export function confettiCount(input: { payout: number; bigBlind: number }): number {
  if (input.payout <= 0) return 0;
  const bb = input.payout / Math.max(1, input.bigBlind);
  const raw = CONFETTI_MIN + bb * PER_BIG_BLIND;
  return Math.min(CONFETTI_MAX, Math.max(CONFETTI_MIN, Math.round(raw)));
}

/**
 * Deterministic for a given seed. React re-renders during the fall, and pieces
 * that reshuffled every render would jitter instead of falling.
 */
export function confettiPieces(count: number, seed: number): ConfettiPiece[] {
  if (count <= 0) return [];
  const rng = createSeededRng(seed);

  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    xPct: Math.round(rng() * 100),
    delay: Math.round(rng() * 60) / 100,
    duration: 1.6 + Math.round(rng() * 140) / 100,
    rotate: Math.round(rng() * 720) - 360,
    drift: Math.round(rng() * 120) - 60,
    size: 6 + Math.round(rng() * 6),
    color: COLORS[Math.floor(rng() * COLORS.length)] ?? COLORS[0],
  }));
}

/** Stable seed per hand, so the same hand always throws the same confetti. */
export function seedFromHandId(handId: string | undefined): number {
  if (!handId) return 1;
  let hash = 2166136261;
  for (let i = 0; i < handId.length; i++) {
    hash ^= handId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
