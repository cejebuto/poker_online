import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { startRoomHand, applyPlayerAction } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { toPublicRoomState } from '../src/domain/publicState.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

let seq = 0;

async function tableOfThree() {
  const tag = `pot${(seq += 1)}`;
  const host = await createRoom({
    password: '',
    user: { displayName: 'host' },
    connectionId: `${tag}-a`,
    config: { turnTimeoutMs: 0, smallBlind: 50, bigBlind: 100, startingStack: 5000 },
  });
  const ids = [host.player.playerId];
  for (const n of ['p2', 'p3']) {
    const j = await joinRoom({
      roomId: host.room.roomId,
      password: '',
      user: { displayName: n },
      connectionId: `${tag}-${n}`,
    });
    ids.push(j.player.playerId);
  }
  return { room: roomRegistry.get(host.room.roomId)!, ids };
}

describe('public pot total', () => {
  after(() => _clearAllTimersForTests());

  it('counts the blinds as soon as the hand starts', async () => {
    const { room, ids } = await tableOfThree();
    startRoomHand(room);
    const pub = toPublicRoomState(room, ids[0]!);
    assert.equal(pub.hand?.potTotal, 150, 'small blind + big blind');
  });

  it('grows with every chip committed during the betting round', async () => {
    const { room, ids } = await tableOfThree();
    startRoomHand(room);
    const seat = room.hand!.currentToAct!;
    const actor = [...room.players.values()].find((p) => p.seat === seat)!;
    applyPlayerAction(room, {
      playerId: actor.playerId,
      handId: room.hand!.handId,
      action: 'call',
      clientActionId: `pot-call-${seq}`,
    });
    const pub = toPublicRoomState(room, ids[0]!);
    assert.equal(pub.hand?.potTotal, 250, 'blinds plus the call');
  });

  it('still reports the pot once the hand is complete', async () => {
    const { room, ids } = await tableOfThree();
    startRoomHand(room);
    // Everyone folds to the big blind.
    for (let i = 0; i < 2; i++) {
      const seat = room.hand!.currentToAct;
      if (seat === null) break;
      const actor = [...room.players.values()].find((p) => p.seat === seat)!;
      applyPlayerAction(room, {
        playerId: actor.playerId,
        handId: room.hand!.handId,
        action: 'fold',
        clientActionId: `pot-fold-${seq}-${i}`,
      });
    }
    const pub = toPublicRoomState(room, ids[0]!);
    assert.equal(room.hand?.phase, 'COMPLETE');
    assert.ok((pub.hand?.potTotal ?? 0) > 0, 'a completed hand still shows what was won');
  });

  it('is zero before any hand has been dealt', async () => {
    const { room, ids } = await tableOfThree();
    const pub = toPublicRoomState(room, ids[0]!);
    assert.equal(pub.hand, undefined);
  });
});
