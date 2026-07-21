import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import {
  createRoom,
  joinRoom,
  detachConnection,
  purgeStaleDisconnected,
  reassignHostIfAbsent,
} from '../src/domain/roomService.js';
import { startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';
import { reconnectWindowMs } from '../src/domain/types.js';
import type { InternalRoom } from '../src/domain/types.js';

let seq = 0;

async function tableOf(n: number): Promise<{ room: InternalRoom; ids: string[] }> {
  const tag = `pg${(seq += 1)}`;
  const host = await createRoom({
    password: '',
    user: { displayName: 'host' },
    connectionId: `${tag}-c0`,
    config: { turnTimeoutMs: 0, startingStack: 1000 },
  });
  const ids = [host.player.playerId];
  for (let i = 1; i < n; i++) {
    const j = await joinRoom({
      roomId: host.room.roomId,
      password: '',
      user: { displayName: `p${i}` },
      connectionId: `${tag}-c${i}`,
    });
    ids.push(j.player.playerId);
  }
  return { room: roomRegistry.get(host.room.roomId)!, ids };
}

/** Simulate the reconnect window having elapsed. */
function ageOut(room: InternalRoom, playerId: string): void {
  const p = room.players.get(playerId)!;
  p.disconnectedAt = Date.now() - reconnectWindowMs(room.config) - 1;
}

describe('host reassignment on disconnect', () => {
  after(() => _clearAllTimersForTests());

  it('moves the crown to a connected player when the host drops', async () => {
    const { room, ids } = await tableOf(2);
    detachConnection(room.roomId, ids[0]!, `${room.roomId}-conn`);
    // detachConnection removed the only connection, so the host is now offline.
    room.players.get(ids[0]!)!.connected = false;
    reassignHostIfAbsent(room);
    assert.equal(room.hostPlayerId, ids[1]!);
    assert.equal(room.players.get(ids[1]!)!.role, 'host');
  });

  it('keeps the crown when the host is still connected', async () => {
    const { room, ids } = await tableOf(2);
    reassignHostIfAbsent(room);
    assert.equal(room.hostPlayerId, ids[0]!);
  });

  it('does nothing when nobody else is connected to take over', async () => {
    const { room, ids } = await tableOf(2);
    for (const id of ids) room.players.get(id)!.connected = false;
    reassignHostIfAbsent(room);
    assert.equal(room.hostPlayerId, ids[0]!, 'no eligible successor, crown stays put');
  });
});

describe('purging stale disconnected players', () => {
  after(() => _clearAllTimersForTests());

  it('removes a player who stayed disconnected past the reconnect window', async () => {
    const { room, ids } = await tableOf(2);
    const p = room.players.get(ids[1]!)!;
    p.connected = false;
    p.connectionStatus = 'disconnected';
    ageOut(room, ids[1]!);
    const purged = purgeStaleDisconnected(room);
    assert.deepEqual(purged, [ids[1]!]);
    assert.equal(room.players.has(ids[1]!), false);
  });

  it('keeps a player who is still within the reconnect window', async () => {
    const { room, ids } = await tableOf(2);
    const p = room.players.get(ids[1]!)!;
    p.connected = false;
    p.connectionStatus = 'disconnected';
    p.disconnectedAt = Date.now(); // just now
    assert.deepEqual(purgeStaleDisconnected(room), []);
    assert.equal(room.players.has(ids[1]!), true);
  });

  it('never purges a connected player', async () => {
    const { room, ids } = await tableOf(2);
    ageOut(room, ids[1]!); // stale timestamp but still connected
    assert.deepEqual(purgeStaleDisconnected(room), []);
    assert.equal(room.players.has(ids[1]!), true);
  });

  it('transfers the crown when the purged player was the host', async () => {
    const { room, ids } = await tableOf(2);
    const host = room.players.get(ids[0]!)!;
    host.connected = false;
    host.connectionStatus = 'disconnected';
    ageOut(room, ids[0]!);
    purgeStaleDisconnected(room);
    assert.equal(room.players.has(ids[0]!), false);
    assert.equal(room.hostPlayerId, ids[1]!);
  });

  it('does not purge a disconnected player who is still in a live hand', async () => {
    const { room } = await tableOf(3);
    startRoomHand(room);
    const victim = [...room.players.values()].find((p) => p.seat !== null)!;
    victim.connected = false;
    victim.connectionStatus = 'disconnected';
    victim.disconnectedAt = Date.now() - reconnectWindowMs(room.config) - 1;
    assert.deepEqual(purgeStaleDisconnected(room), [], 'the hand still needs that seat');
    assert.equal(room.players.has(victim.playerId), true);
  });

  it('purges once the hand is over', async () => {
    const { room } = await tableOf(3);
    startRoomHand(room);
    const victim = [...room.players.values()].find((p) => p.seat !== null)!;
    victim.connected = false;
    victim.connectionStatus = 'disconnected';
    victim.disconnectedAt = Date.now() - reconnectWindowMs(room.config) - 1;
    if (room.hand) room.hand.phase = 'COMPLETE';
    const purged = purgeStaleDisconnected(room);
    assert.deepEqual(purged, [victim.playerId]);
  });
});
