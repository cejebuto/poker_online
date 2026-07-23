/**
 * Turn clock arithmetic, shared by the classic bar and the felt's ring.
 *
 * The server sends a start stamp, a base timeout and the actor's time bank;
 * everything the UI shows is derived from those three numbers plus the local
 * clock, so nothing has to be ticked over the wire.
 */

export type TurnClock = {
  /** Base timeout plus whatever bank the actor still has. */
  totalMs: number;
  elapsedMs: number;
  remainingMs: number;
  /** 0 while fresh, 1 once the clock is out. */
  spent: number;
  /** The base timeout is gone and the actor is burning bank time. */
  inBank: boolean;
  expired: boolean;
};

export function turnClock(input: {
  now: number;
  startedAt?: number;
  timeoutMs?: number;
  bankMs?: number;
}): TurnClock | null {
  const { now, startedAt, timeoutMs } = input;
  if (!startedAt || !timeoutMs || timeoutMs <= 0) return null;

  const bank = Math.max(0, input.bankMs ?? 0);
  const totalMs = timeoutMs + bank;
  const elapsedMs = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, totalMs - elapsedMs);

  return {
    totalMs,
    elapsedMs,
    remainingMs,
    spent: Math.min(1, elapsedMs / totalMs),
    inBank: elapsedMs > timeoutMs,
    expired: remainingMs <= 0,
  };
}

/** Below this share of the clock the ring turns red and starts pulsing. */
export const TURN_DANGER_RATIO = 0.25;

export function isTurnDanger(clock: TurnClock): boolean {
  return clock.remainingMs <= clock.totalMs * TURN_DANGER_RATIO;
}
