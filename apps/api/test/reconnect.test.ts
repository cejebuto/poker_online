import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import {
  attachConnection,
  createRoom,
  detachConnection,
  joinRoom,
} from '../src/domain/roomService.js';
import { startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { serializeRoom, deserializeRoom } from '../src/domain/roomSerialize.js';
import { toPublicRoomState } from '../src/domain/publicState.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

describe('reconnect + snapshot', () => {
  after(() => _clearAllTimersForTests());

  it('marks disconnected and restores on attach', async () => {
    const host = await createRoom({
      password: 'Reconn',
      user: { displayName: 'H' },
      connectionId: 'c1',
      config: { turnTimeoutMs: 0 },
    });
    const room = roomRegistry.get(host.room.roomId)!;
    detachConnection(room.roomId, host.player.playerId, 'c1');
    const p = room.players.get(host.player.playerId)!;
    assert.equal(p.connected, false);
    assert.equal(p.connectionStatus, 'disconnected');

    attachConnection(room, host.player.playerId, 'c2');
    assert.equal(p.connected, true);
    assert.equal(p.connectionStatus, 'connected');
  });

  it('serialize/deserialize preserves stacks and hand holes (server-side)', async () => {
    const host = await createRoom({
      password: 'Snapxx',
      user: { displayName: 'H' },
      connectionId: 's1',
      config: { turnTimeoutMs: 0 },
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Snapxx',
      user: { displayName: 'G' },
      connectionId: 's2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    startRoomHand(room);
    const totalBefore = [...room.players.values()].reduce((s, p) => s + p.stack, 0);
    const handContrib = room.hand!.players.reduce((s, p) => s + p.contribution, 0);
    const chips = totalBefore + handContrib;

    const json = serializeRoom(room);
    const restored = deserializeRoom(json);
    assert.equal(restored.hand?.handId, room.hand?.handId);
    assert.equal(restored.hand?.players[0]?.holeCards.length, 2);
    const totalAfter =
      [...restored.players.values()].reduce((s, p) => s + p.stack, 0) +
      (restored.hand?.players.reduce((s, p) => s + p.contribution, 0) ?? 0);
    assert.equal(totalAfter, chips);

    // public state still private
    const pub = toPublicRoomState(restored, host.player.playerId);
    assert.equal(JSON.stringify(pub).includes('passwordHash'), false);
    assert.equal(JSON.stringify(pub).includes('"deck"'), false);
  });
});
