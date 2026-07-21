import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { applyPlayerAction, startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { toPublicRoomState } from '../src/domain/publicState.js';

describe('room + hand integration', () => {
  it('creates room, joins, plays check-down hand', async () => {
    const host = await createRoom({
      password: 'Pokerx',
      user: { displayName: 'Host' },
      connectionId: 'h1',
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Pokerx',
      user: { displayName: 'Guest' },
      connectionId: 'g1',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    assert.equal(room.players.size, 2);

    const bc = startRoomHand(room);
    assert.ok(bc.deals.length >= 2);
    assert.ok(room.hand);

    let guard = 0;
    while (room.hand && room.hand.phase !== 'COMPLETE' && guard++ < 100) {
      const seat = room.hand.currentToAct;
      if (seat === null) break;
      const player = [...room.players.values()].find((p) => p.seat === seat)!;
      const hp = room.hand.players.find((p) => p.seat === seat)!;
      const toCall = room.hand.currentBet - hp.betThisRound;
      applyPlayerAction(room, {
        playerId: player.playerId,
        handId: room.hand.handId,
        action: toCall > 0 ? 'call' : 'check',
        clientActionId: `a-${guard}`,
      });
    }
    assert.equal(room.hand?.phase, 'COMPLETE');
    assert.equal(room.phase, 'LOBBY');
    const pub = toPublicRoomState(room, host.player.playerId);
    assert.ok(pub.lastResult || pub.hand);
  });

  it('rejects out-of-turn action', async () => {
    const host = await createRoom({
      password: 'Turnxx',
      user: { displayName: 'H' },
      connectionId: 't1',
    });
    const guest = await joinRoom({
      roomId: host.room.roomId,
      password: 'Turnxx',
      user: { displayName: 'G' },
      connectionId: 't2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    startRoomHand(room);
    const toAct = room.hand!.currentToAct!;
    const wrong = [...room.players.values()].find((p) => p.seat !== toAct)!;
    assert.throws(() =>
      applyPlayerAction(room, {
        playerId: wrong.playerId,
        handId: room.hand!.handId,
        action: 'fold',
        clientActionId: 'bad',
      }),
    );
    // right player can fold
    const right = [...room.players.values()].find((p) => p.seat === toAct)!;
    applyPlayerAction(room, {
      playerId: right.playerId,
      handId: room.hand!.handId,
      action: 'fold',
      clientActionId: 'ok',
    });
    assert.ok(guest.player.playerId);
  });
});
