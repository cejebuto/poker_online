import type { RoomSummary } from '@poker/shared';
import type { InternalRoom } from './types.js';
import { roomRegistry } from './roomRegistry.js';

/**
 * A table with nobody connected is dead weight — rooms revived from snapshots on
 * boot start that way, and advertising them sends people into empty tables.
 * A mesa screen alone does not count: it cannot play.
 */
export function hasSomeonePresent(room: InternalRoom): boolean {
  return [...room.players.values()].some((p) => p.role !== 'mesa' && p.connected);
}

/**
 * Public directory of joinable tables. Deliberately narrow: name, code and seat
 * counts only — never the password hash, players or hand state.
 */
export function listActiveRooms(): RoomSummary[] {
  return roomRegistry
    .all()
    .filter((room) => room.phase !== 'CLOSED' && hasSomeonePresent(room))
    .map((room) => ({
      roomId: room.roomId,
      code: room.code,
      name: room.config.name,
      players: [...room.players.values()].filter((p) => p.role !== 'mesa').length,
      maxPlayers: room.config.maxPlayers,
      phase: room.phase,
      hasPassword: room.hasPassword,
    }))
    .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
}
