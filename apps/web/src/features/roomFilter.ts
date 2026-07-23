import type { RoomSummary } from '@poker/shared';

/** Max active tables shown on the home screen (matches server directory cap). */
export const MAX_ACTIVE_ROOMS = 5;

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Match a table by name or code, ignoring case and accents. */
export function matchesQuery(room: RoomSummary, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(`${room.name} ${room.code}`).includes(q);
}

/**
 * Filter by search query, then cap at {@link MAX_ACTIVE_ROOMS}.
 * Order is preserved (server already sorts by occupancy).
 */
export function filterRooms(rooms: RoomSummary[], query: string): RoomSummary[] {
  return rooms.filter((room) => matchesQuery(room, query)).slice(0, MAX_ACTIVE_ROOMS);
}
