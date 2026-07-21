import { loadLatestSnapshots } from '../persistence/eventStore.js';
import { deserializeRoom, type SerializedRoom } from './roomSerialize.js';
import { roomRegistry } from './roomRegistry.js';
import { scheduleTurnTimer } from './timerService.js';
import { scheduleDestroyIfEmpty } from './roomService.js';

/**
 * Rebuild active rooms from Postgres snapshots after process restart.
 */
export async function hydrateRoomsFromSnapshots(): Promise<number> {
  const snaps = await loadLatestSnapshots();
  let n = 0;
  for (const snap of snaps) {
    try {
      const data = snap.stateJson as SerializedRoom;
      if (!data?.roomId || !data.passwordHash) continue;
      const room = deserializeRoom(data);
      room.version = Math.max(room.version, snap.version);
      roomRegistry.set(room);
      if (room.hand && room.hand.phase !== 'COMPLETE' && room.hand.currentToAct !== null) {
        scheduleTurnTimer(room);
      }
      // Every hydrated room starts with nobody connected. Without this the room
      // would live forever: the destroy timer is only armed on disconnect/leave,
      // neither of which happens on boot.
      scheduleDestroyIfEmpty(room);
      n += 1;
    } catch (err) {
      console.warn('[hydrate] skip room', snap.roomId, (err as Error).message);
    }
  }
  console.log(JSON.stringify({ msg: 'hydrate', rooms: n }));
  return n;
}
