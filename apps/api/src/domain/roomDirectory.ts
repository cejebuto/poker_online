import type { RoomSummary } from '@poker/shared';
import { roomRegistry } from './roomRegistry.js';

/**
 * Public directory of joinable tables. Deliberately narrow: name, code and seat
 * counts only — never the password hash, players or hand state.
 */
export function listActiveRooms(): RoomSummary[] {
  return roomRegistry
    .all()
    .filter((room) => room.phase !== 'CLOSED')
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
