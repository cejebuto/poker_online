import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { applyPlayerAction, startRoomHand } from '../src/domain/handService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { applyRebuy, canRebuy, currentBlinds } from '../src/domain/modes.js';
import { effectiveBlinds } from '../src/domain/blinds.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';
import { toPublicRoomState } from '../src/domain/publicState.js';

describe('cash / tournament modes', () => {
  after(() => _clearAllTimersForTests());

  it('doubleMinimum doubles effective blinds', () => {
    const blinds = effectiveBlinds(
      {
        name: 't',
        maxPlayers: 6,
        startingStack: 1000,
        mode: 'cash',
        smallBlind: 5,
        bigBlind: 10,
        doubleMinimum: true,
      },
      0,
    );
    assert.equal(blinds.smallBlind, 10);
    assert.equal(blinds.bigBlind, 20);
  });

  it('cash rebuy restores stack up to startingStack', async () => {
    const host = await createRoom({
      password: 'Cashxx',
      user: { displayName: 'H' },
      connectionId: 'm1',
      config: { mode: 'cash', allowRebuy: true, rebuyMax: 2, turnTimeoutMs: 0 },
    });
    const room = roomRegistry.get(host.room.roomId)!;
    const p = room.players.get(host.player.playerId)!;
    p.stack = 0;
    p.connectionStatus = 'sitting_out';
    assert.equal(canRebuy(room, host.player.playerId).ok, true);
    const res = applyRebuy(room, host.player.playerId);
    assert.equal(res.stack, room.config.startingStack);
    assert.equal(res.rebuyCount, 1);
    applyRebuy(room, host.player.playerId);
    assert.equal(canRebuy(room, host.player.playerId).ok, false);
  });

  it('tournament uses progressive level blinds and rejects rebuy', async () => {
    const host = await createRoom({
      password: 'Tournx',
      user: { displayName: 'H' },
      connectionId: 't1',
      config: {
        mode: 'tournament',
        smallBlind: 5,
        bigBlind: 10,
        turnTimeoutMs: 0,
        blindStructure: [
          { smallBlind: 5, bigBlind: 10, durationMs: 1 },
          { smallBlind: 50, bigBlind: 100, durationMs: 60_000 },
        ],
      },
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Tournx',
      user: { displayName: 'G' },
      connectionId: 't2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    assert.equal(canRebuy(room, host.player.playerId).ok, false);

    // Force level advance by backdating level start
    room.tournament.levelStartedAt = Date.now() - 1000;
    startRoomHand(room);
    const blinds = currentBlinds(room);
    assert.equal(blinds.bigBlind, 100);

    const pub = toPublicRoomState(room, host.player.playerId);
    assert.ok(pub.tournament);
    assert.equal(pub.effectiveBigBlind, 100);
  });

  it('maxPlayers is enforced', async () => {
    const host = await createRoom({
      password: 'Maxxxx',
      user: { displayName: 'H' },
      connectionId: 'x1',
      config: { maxPlayers: 2, turnTimeoutMs: 0 },
    });
    await joinRoom({
      roomId: host.room.roomId,
      password: 'Maxxxx',
      user: { displayName: 'G' },
      connectionId: 'x2',
    });
    await assert.rejects(
      () =>
        joinRoom({
          roomId: host.room.roomId,
          password: 'Maxxxx',
          user: { displayName: 'Z' },
          connectionId: 'x3',
        }),
      (err: Error & { code?: string }) => err.code === 'ROOM_FULL',
    );
  });

  it('tournament eliminates busted player', async () => {
    const host = await createRoom({
      password: 'Elimxx',
      user: { displayName: 'H' },
      connectionId: 'e1',
      config: { mode: 'tournament', turnTimeoutMs: 0, startingStack: 100 },
    });
    const guest = await joinRoom({
      roomId: host.room.roomId,
      password: 'Elimxx',
      user: { displayName: 'G' },
      connectionId: 'e2',
    });
    const room = roomRegistry.get(host.room.roomId)!;
    startRoomHand(room);
    // Force guest stack to 0 via engine fold-out isn't enough for both —
    // simulate post-hand by zeroing stack and completing
    const g = room.players.get(guest.player.playerId)!;
    g.stack = 0;
    // fold until complete
    let guard = 0;
    while (room.hand && room.hand.phase !== 'COMPLETE' && guard++ < 30) {
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
    // Ensure bust applied
    g.stack = 0;
    const { applyPostHandModeRules } = await import('../src/domain/modes.js');
    applyPostHandModeRules(room);
    assert.equal(g.connectionStatus, 'eliminated');
    assert.ok(g.finishPlace);
  });
});
