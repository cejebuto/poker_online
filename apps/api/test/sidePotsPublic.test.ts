import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { startRoomHand, applyPlayerAction } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { toPublicRoomState } from '../src/domain/publicState.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

/**
 * The shared screen renders whatever `hand.pots` carries, so what matters here is
 * that unequal all-ins actually reach the client as more than one pot.
 */
describe('side pots reach the public state', () => {
  after(() => _clearAllTimersForTests());

  it('splits a short all-in into a main pot plus a side pot', async () => {
    const host = await createRoom({
      password: '',
      user: { displayName: 'rich' },
      connectionId: 'sp-a',
      config: { turnTimeoutMs: 0, smallBlind: 5, bigBlind: 10, startingStack: 1000 },
    });
    for (const n of ['mid', 'short']) {
      await joinRoom({
        roomId: host.room.roomId,
        password: '',
        user: { displayName: n },
        connectionId: `sp-${n}`,
      });
    }

    const room = roomRegistry.get(host.room.roomId)!;
    // Uneven stacks are what create side pots; a fresh table has none.
    room.players.get([...room.players.values()].find((p) => p.displayName === 'mid')!.playerId)!
      .stack = 600;
    room.players.get([...room.players.values()].find((p) => p.displayName === 'short')!.playerId)!
      .stack = 200;

    startRoomHand(room);

    let guard = 0;
    while (room.hand && room.hand.phase !== 'COMPLETE' && guard++ < 30) {
      const seat = room.hand.currentToAct;
      if (seat === null) break;
      const actor = [...room.players.values()].find((p) => p.seat === seat)!;
      applyPlayerAction(room, {
        playerId: actor.playerId,
        handId: room.hand.handId,
        action: 'all-in',
        clientActionId: `sp-shove-${guard}`,
      });
    }

    assert.equal(room.hand?.phase, 'COMPLETE');
    const pub = toPublicRoomState(room, null);
    const pots = pub.hand?.pots ?? [];
    assert.ok(pots.length > 1, `expected a side pot, got ${JSON.stringify(pots)}`);
    assert.ok(
      pots.every((p) => p.amount > 0),
      'every pot the mesa draws must hold chips',
    );
    // The short stack cannot be paid out of the side pot.
    const shortSeat = [...room.players.values()].find((p) => p.displayName === 'short')!.seat!;
    assert.ok(
      pots.slice(1).every((p) => !p.eligibleSeats.includes(shortSeat)),
      'the short stack is only eligible for the main pot',
    );
  });
});
