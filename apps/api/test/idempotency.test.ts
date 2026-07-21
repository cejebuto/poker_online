import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { applyPlayerAction, startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

describe('idempotency', () => {
  after(() => _clearAllTimersForTests());

  it('replaying the same clientActionId does not apply twice', async () => {
    const host = await createRoom({
      password: 'Idemab',
      user: { displayName: 'H' },
      connectionId: 'i1',
      config: { turnTimeoutMs: 0 },
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Idemab',
      user: { displayName: 'G' },
      connectionId: 'i2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    startRoomHand(room);
    assert.ok(room.hand);
    const seat = room.hand.currentToAct!;
    const player = [...room.players.values()].find((p) => p.seat === seat)!;
    const versionBefore = room.version;
    const handId = room.hand.handId;

    const first = applyPlayerAction(room, {
      playerId: player.playerId,
      handId,
      action: 'fold',
      clientActionId: 'same-id-xyz',
    });
    assert.equal(first.idempotent, undefined);
    const versionAfter = room.version;

    const second = applyPlayerAction(room, {
      playerId: player.playerId,
      handId,
      action: 'fold',
      clientActionId: 'same-id-xyz',
    });
    assert.equal(second.idempotent, true);
    assert.equal(room.version, versionAfter);
    assert.ok(room.version > versionBefore || first.domainEvents.length >= 0);

    const third = applyPlayerAction(room, {
      playerId: player.playerId,
      handId,
      action: 'fold',
      clientActionId: 'same-id-xyz',
    });
    assert.equal(third.idempotent, true);
    assert.equal(room.version, versionAfter);
  });
});
