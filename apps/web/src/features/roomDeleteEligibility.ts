import { ROOM_DELETE_ADMIN_NAME } from '@poker/shared';

/**
 * Whether the home directory should show "Eliminar mesa".
 * Mirrors the server gate in `forceDeleteSoloRoom`: exact admin name + solo table.
 */
export function canDeleteRoomFromDirectory(
  displayName: string,
  room: { players: number },
): boolean {
  return displayName === ROOM_DELETE_ADMIN_NAME && room.players === 1;
}
