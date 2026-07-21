import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { startRoomHand, applyPlayerAction } from '../src/domain/handService.js';
import { findPrivateLeaks, toPublicRoomState } from '../src/domain/publicState.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';

describe('privacy filter', () => {
  it('public state never includes passwordHash or deck', async () => {
    const created = await createRoom({
      password: 'Secret',
      user: { displayName: 'Host' },
      connectionId: 'c1',
    });
    await joinRoom({
      roomId: created.room.roomId,
      password: 'Secret',
      user: { displayName: 'P2' },
      connectionId: 'c2',
    });

    const room = roomRegistry.get(created.room.roomId)!;
    startRoomHand(room);

    const pubHost = toPublicRoomState(room, created.player.playerId);
    const pubOther = toPublicRoomState(
      room,
      [...room.players.values()].find((p) => p.playerId !== created.player.playerId)!.playerId,
    );
    const pubMesa = toPublicRoomState(room, null);

    for (const payload of [pubHost, pubOther, pubMesa]) {
      const leaks = findPrivateLeaks(payload);
      assert.deepEqual(leaks, [], JSON.stringify(leaks));
      const raw = JSON.stringify(payload);
      assert.equal(raw.includes('passwordHash'), false);
      assert.equal(raw.includes('"deck"'), false);
      assert.equal(raw.includes('password'), false);
    }

    // Host sees own cards; mesa does not
    assert.ok(pubHost.hand?.yourCards?.length === 2);
    assert.equal(pubMesa.hand?.yourCards, undefined);

    // Other player's cards not embedded as holeCards anywhere
    assert.equal(JSON.stringify(pubOther).includes('holeCards'), false);
  });

  it('wrong password does not leak room existence details beyond error', async () => {
    const created = await createRoom({
      password: 'Secret',
      user: { displayName: 'Host' },
      connectionId: 'c3',
    });
    await assert.rejects(
      () =>
        joinRoom({
          roomId: created.room.roomId,
          password: 'Wrongg',
          user: { displayName: 'X' },
          connectionId: 'c4',
        }),
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'BAD_PASSWORD');
        return true;
      },
    );
  });

  it('fold-out does not expose showdown cards via public state', async () => {
    const created = await createRoom({
      password: 'Abcdef',
      user: { displayName: 'H' },
      connectionId: 'a1',
      config: { startingStack: 100 },
    });
    const j = await joinRoom({
      roomId: created.room.roomId,
      password: 'Abcdef',
      user: { displayName: 'B' },
      connectionId: 'a2',
    });
    const room = roomRegistry.get(created.room.roomId)!;
    startRoomHand(room);
    // Fold until one remains
    let guard = 0;
    while (room.hand && room.hand.phase !== 'COMPLETE' && guard++ < 20) {
      const seat = room.hand.currentToAct;
      if (seat === null) break;
      const player = [...room.players.values()].find((p) => p.seat === seat)!;
      applyPlayerAction(room, {
        playerId: player.playerId,
        handId: room.hand.handId,
        action: 'fold',
        clientActionId: `f-${guard}`,
      });
    }
    const pub = toPublicRoomState(room, j.player.playerId);
    assert.equal(JSON.stringify(pub).includes('holeCards'), false);
    assert.ok(findPrivateLeaks(pub).length === 0);
  });
});
