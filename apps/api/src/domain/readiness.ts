import type { InternalPlayer, InternalRoom } from './types.js';

/** Players dealt into the next hand. Disconnected players still play — they auto-fold. */
export function seatedForHand(room: InternalRoom): InternalPlayer[] {
  return [...room.players.values()].filter(
    (p) =>
      p.role !== 'mesa' &&
      p.seat !== null &&
      p.stack > 0 &&
      p.connectionStatus !== 'sitting_out' &&
      p.connectionStatus !== 'eliminated',
  );
}

/** Players whose acceptance is required. A player who is away must not freeze the table. */
function awaitingReady(room: InternalRoom): InternalPlayer[] {
  return seatedForHand(room).filter((p) => p.connected);
}

export function setPlayerReady(room: InternalRoom, playerId: string, ready: boolean): void {
  const player = room.players.get(playerId);
  if (player) player.ready = ready;
}

export function resetReady(room: InternalRoom): void {
  for (const p of room.players.values()) p.ready = false;
}

/**
 * Progress toward the next hand. `allReady` stays false below two seated players so
 * an empty table never auto-starts.
 */
export function readySummary(room: InternalRoom): {
  ready: number;
  needed: number;
  allReady: boolean;
} {
  const waiting = awaitingReady(room);
  const ready = waiting.filter((p) => p.ready).length;
  const needed = waiting.length;
  const enoughPlayers = seatedForHand(room).length >= 2;
  return { ready, needed, allReady: enoughPlayers && needed > 0 && ready === needed };
}
