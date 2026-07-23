import type { RoomSummary } from '@poker/shared';
import type { InternalRoom } from './types.js';
import { currentBlinds } from './modes.js';
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
 * Public directory of joinable tables. Deliberately narrow: name, code, seats
 * and blinds — never the password hash, players or hand state.
 * The home UI caps how many rows it shows; this list stays complete for search.
 */
export function listActiveRooms(): RoomSummary[] {
  return roomRegistry
    .all()
    .filter((room) => room.phase !== 'CLOSED' && hasSomeonePresent(room))
    .map((room) => {
      const blinds = currentBlinds(room);
      return {
        roomId: room.roomId,
        code: room.code,
        name: room.config.name,
        players: [...room.players.values()].filter((p) => p.role !== 'mesa').length,
        maxPlayers: room.config.maxPlayers,
        phase: room.phase,
        hasPassword: room.hasPassword,
        smallBlind: blinds.smallBlind,
        bigBlind: blinds.bigBlind,
      };
    })
    .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
}
