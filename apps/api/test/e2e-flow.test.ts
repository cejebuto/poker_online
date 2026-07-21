/**
 * End-to-end multi-player flow at domain layer (CI-friendly, no browser).
 * Covers: create private room → join → multi-hand → all-in side pots → chip conservation.
 */
import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { applyPlayerAction, startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { toPublicRoomState, findPrivateLeaks } from '../src/domain/publicState.js';
import { buildSidePots } from '@poker/engine';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

function totalChips(roomId: string): number {
  const room = roomRegistry.get(roomId)!;
  const stacks = [...room.players.values()]
    .filter((p) => p.role !== 'mesa')
    .reduce((s, p) => s + p.stack, 0);
  const inPot = room.hand?.players.reduce((s, p) => s + p.contribution, 0) ?? 0;
  return stacks + inPot;
}

function playToComplete(roomId: string, maxSteps = 200): void {
  const room = roomRegistry.get(roomId)!;
  let steps = 0;
  while (room.hand && room.hand.phase !== 'COMPLETE' && steps++ < maxSteps) {
    const seat = room.hand.currentToAct;
    if (seat === null) break;
    const player = [...room.players.values()].find((p) => p.seat === seat);
    if (!player) break;
    const hp = room.hand.players.find((p) => p.seat === seat)!;
    const toCall = room.hand.currentBet - hp.betThisRound;
    applyPlayerAction(room, {
      playerId: player.playerId,
      handId: room.hand.handId,
      action: toCall > 0 ? 'call' : 'check',
      clientActionId: `e2e-${roomId}-${steps}`,
    });
  }
}

describe('e2e multi-client game flow', () => {
  after(() => _clearAllTimersForTests());

  it('private room: create → join password → several hands → conservation', async () => {
    const host = await createRoom({
      password: 'EeePwd',
      user: { displayName: 'Host' },
      connectionId: 'e2e-h',
      config: { turnTimeoutMs: 0, mode: 'cash', startingStack: 500 },
    });
    await assert.rejects(
      () =>
        joinRoom({
          roomId: host.room.roomId,
          password: 'Wrongx',
          user: { displayName: 'X' },
          connectionId: 'bad',
        }),
      (e: Error & { code?: string }) => e.code === 'BAD_PASSWORD',
    );

    const p2 = await joinRoom({
      roomId: host.room.roomId,
      password: 'EeePwd',
      user: { displayName: 'P2' },
      connectionId: 'e2e-p2',
    });
    const mesa = await joinRoom({
      roomId: host.room.roomId,
      password: 'EeePwd',
      user: { displayName: 'Mesa' },
      connectionId: 'e2e-mesa',
      asMesa: true,
    });
    assert.equal(mesa.player.role, 'mesa');

    const room = roomRegistry.get(host.room.roomId)!;
    const initial = totalChips(host.room.roomId);
    assert.equal(initial, 1000); // 2 players × 500

    for (let hand = 0; hand < 3; hand++) {
      startRoomHand(room);
      // mesa never gets private cards in public state
      const mesaPub = toPublicRoomState(room, mesa.player.playerId);
      assert.equal(mesaPub.hand?.yourCards, undefined);
      assert.deepEqual(findPrivateLeaks(mesaPub), []);

      const hostPub = toPublicRoomState(room, host.player.playerId);
      assert.equal(hostPub.hand?.yourCards?.length, 2);

      playToComplete(host.room.roomId);
      assert.equal(room.hand?.phase, 'COMPLETE');
      assert.equal(totalChips(host.room.roomId), initial);
    }

    assert.ok(p2.player.playerId);
  });

  it('side pots match engine (spec §9.3) and split pot conserves chips', () => {
    const pots = buildSidePots([
      { seat: 0, amount: 100, eligible: true },
      { seat: 1, amount: 300, eligible: true },
      { seat: 2, amount: 300, eligible: true },
    ]);
    assert.equal(pots[0]!.amount, 300);
    assert.equal(pots[1]!.amount, 400);
    assert.equal(pots[0]!.amount + pots[1]!.amount, 700);
  });

  it('idempotent action under reconnect-style retries', async () => {
    const host = await createRoom({
      password: 'Retryx',
      user: { displayName: 'H' },
      connectionId: 'r1',
      config: { turnTimeoutMs: 0, startingStack: 200 },
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Retryx',
      user: { displayName: 'G' },
      connectionId: 'r2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    startRoomHand(room);
    const seat = room.hand!.currentToAct!;
    const player = [...room.players.values()].find((p) => p.seat === seat)!;
    const id = 'retry-client-action-1';
    applyPlayerAction(room, {
      playerId: player.playerId,
      handId: room.hand!.handId,
      action: 'fold',
      clientActionId: id,
    });
    const v = room.version;
    const second = applyPlayerAction(room, {
      playerId: player.playerId,
      handId: room.hand!.handId,
      action: 'fold',
      clientActionId: id,
    });
    assert.equal(second.idempotent, true);
    assert.equal(room.version, v);
  });
});
