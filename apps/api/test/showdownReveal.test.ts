import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { startRoomHand, applyPlayerAction } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { findPrivateLeaks, toPublicRoomState } from '../src/domain/publicState.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

let seq = 0;

async function headsUp() {
  const tag = `sd${(seq += 1)}`;
  const host = await createRoom({
    password: '',
    user: { displayName: 'host' },
    connectionId: `${tag}-a`,
    config: { turnTimeoutMs: 0, smallBlind: 50, bigBlind: 100, startingStack: 1000 },
  });
  const guest = await joinRoom({
    roomId: host.room.roomId,
    password: '',
    user: { displayName: 'guest' },
    connectionId: `${tag}-b`,
  });
  return {
    room: roomRegistry.get(host.room.roomId)!,
    hostId: host.player.playerId,
    guestId: guest.player.playerId,
  };
}

function act(
  room: ReturnType<typeof roomRegistry.get>,
  action: 'fold' | 'call' | 'check' | 'all-in',
  tag: string,
): void {
  const hand = room!.hand!;
  const seat = hand.currentToAct;
  if (seat === null) return;
  const actor = [...room!.players.values()].find((p) => p.seat === seat)!;
  applyPlayerAction(room!, {
    playerId: actor.playerId,
    handId: hand.handId,
    action,
    clientActionId: `${tag}-${seq}-${seat}-${hand.phase}`,
  });
}

describe('showdown reveal in public state', () => {
  after(() => _clearAllTimersForTests());

  it('reveals every hand that reached the end, never under a holeCards key', async () => {
    const { room, hostId } = await headsUp();
    startRoomHand(room);
    act(room, 'all-in', 'sd-shove');
    act(room, 'call', 'sd-call');

    assert.equal(room.hand?.phase, 'COMPLETE');
    const pub = toPublicRoomState(room, hostId);
    const showdown = pub.lastResult?.showdown;
    assert.ok(showdown, 'a contested hand ends with cards on the table');
    assert.equal(showdown.length, 2);
    for (const entry of showdown) {
      assert.equal(entry.cards.length, 2);
      assert.equal(typeof entry.seat, 'number');
    }
    assert.equal(JSON.stringify(pub).includes('holeCards'), false);
    assert.deepEqual(findPrivateLeaks(pub), []);
  });

  it('does not reveal anything while the hand is still live', async () => {
    const { room, hostId } = await headsUp();
    startRoomHand(room);
    const pub = toPublicRoomState(room, hostId);
    assert.equal(pub.lastResult, undefined);
  });

  it('keeps a fold-out winner covered', async () => {
    const { room, hostId } = await headsUp();
    startRoomHand(room);
    act(room, 'fold', 'sd-fold');

    assert.equal(room.hand?.phase, 'COMPLETE');
    const pub = toPublicRoomState(room, hostId);
    assert.ok(pub.lastResult, 'the hand still has a result');
    assert.equal(pub.lastResult.showdown, undefined, 'nobody has to show after a fold-out');
  });
});

describe('committedThisHand', () => {
  after(() => _clearAllTimersForTests());

  it('accumulates across the whole hand, not just the current street', async () => {
    const { room, hostId } = await headsUp();
    startRoomHand(room);

    const blinds = toPublicRoomState(room, hostId).players.map((p) => p.committedThisHand);
    assert.deepEqual([...blinds].sort((a, b) => (a ?? 0) - (b ?? 0)), [50, 100]);

    // Small blind completes, big blind checks: preflop closes at 100 each.
    act(room, 'call', 'cth-call');
    act(room, 'check', 'cth-check');

    const afterPreflop = toPublicRoomState(room, hostId);
    assert.equal(afterPreflop.hand?.phase, 'FLOP');
    for (const p of afterPreflop.players) {
      assert.equal(p.committedThisHand, 100, 'both players are in for the big blind');
      assert.equal(p.betThisRound, 0, 'the street reset, the hand total did not');
    }
  });
});
