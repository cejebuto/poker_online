import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';
import { readySummary, resetReady, setPlayerReady } from '../src/domain/readiness.js';
import type { InternalRoom } from '../src/domain/types.js';

let seq = 0;

async function tableOfTwo(): Promise<{
  room: InternalRoom;
  hostId: string;
  guestId: string;
}> {
  const tag = `rdy${(seq += 1)}`;
  const host = await createRoom({
    password: 'Readyx',
    user: { displayName: 'host' },
    connectionId: `${tag}-c1`,
    config: { mode: 'cash', turnTimeoutMs: 0 },
  });
  const guest = await joinRoom({
    roomId: host.room.roomId,
    password: 'Readyx',
    user: { displayName: 'guest' },
    connectionId: `${tag}-c2`,
  });
  return {
    room: roomRegistry.get(host.room.roomId)!,
    hostId: host.player.playerId,
    guestId: guest.player.playerId,
  };
}

describe('next-hand readiness', () => {
  after(() => _clearAllTimersForTests());

  it('starts with nobody ready and everyone counted', async () => {
    const { room } = await tableOfTwo();
    assert.deepEqual(readySummary(room), { ready: 0, needed: 2, allReady: false });
  });

  it('is not all-ready until the last player accepts', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    setPlayerReady(room, hostId, true);
    assert.deepEqual(readySummary(room), { ready: 1, needed: 2, allReady: false });
    setPlayerReady(room, guestId, true);
    assert.deepEqual(readySummary(room), { ready: 2, needed: 2, allReady: true });
  });

  it('lets a player take back their acceptance', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    setPlayerReady(room, hostId, true);
    setPlayerReady(room, guestId, true);
    setPlayerReady(room, guestId, false);
    assert.deepEqual(readySummary(room), { ready: 1, needed: 2, allReady: false });
  });

  it('does not let a disconnected player block the table', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    const guest = room.players.get(guestId)!;
    guest.connected = false;
    guest.connectionStatus = 'disconnected';
    setPlayerReady(room, hostId, true);
    assert.deepEqual(readySummary(room), { ready: 1, needed: 1, allReady: true });
  });

  it('ignores players sitting out or with no chips', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    room.players.get(guestId)!.stack = 0;
    setPlayerReady(room, hostId, true);
    assert.equal(readySummary(room).needed, 1);
    room.players.get(guestId)!.stack = 500;
    room.players.get(guestId)!.connectionStatus = 'sitting_out';
    assert.equal(readySummary(room).needed, 1);
  });

  it('never reports all-ready with a single player at the table', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    room.players.delete(guestId);
    setPlayerReady(room, hostId, true);
    assert.equal(readySummary(room).allReady, false);
  });

  it('clears every acceptance when a hand starts', async () => {
    const { room, hostId, guestId } = await tableOfTwo();
    setPlayerReady(room, hostId, true);
    setPlayerReady(room, guestId, true);
    startRoomHand(room);
    assert.deepEqual(readySummary(room), { ready: 0, needed: 2, allReady: false });
  });

  it('resetReady clears acceptances without touching stacks', async () => {
    const { room, hostId } = await tableOfTwo();
    setPlayerReady(room, hostId, true);
    resetReady(room);
    assert.equal(room.players.get(hostId)!.ready, false);
    assert.equal(room.players.get(hostId)!.stack > 0, true);
  });
});
