import type { RoomSummary } from '@poker/shared';

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

export function filterRooms(rooms: RoomSummary[], query: string): RoomSummary[] {
  return rooms.filter((room) => matchesQuery(room, query));
}
