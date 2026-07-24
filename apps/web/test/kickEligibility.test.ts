import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicPlayer, PublicRoomState } from '@poker/shared';
import { canKickFromTable } from '../src/features/kickEligibility.js';

function player(id: string, over: Partial<PublicPlayer> = {}): PublicPlayer {
  return {
    playerId: id,
    displayName: id,
    role: 'player',
    seat: 0,
    stack: 100,
    connected: true,
    ...over,
  };
}

function state(over: Partial<PublicRoomState> = {}): PublicRoomState {
  return {
    roomId: 'r',
    code: 'ABCDEF',
    phase: 'LOBBY',
    hostPlayerId: 'host',
    players: [],
    version: 1,
    joinUrl: 'https://example/join/r',
    ...over,
  } as PublicRoomState;
}

describe('canKickFromTable', () => {
  const target = player('guest');

  it('lets the host remove a connected player between hands', () => {
    assert.equal(canKickFromTable(state({ phase: 'LOBBY' }), 'host', target), true);
  });

  it('only the host may kick', () => {
    assert.equal(canKickFromTable(state(), 'guest', player('other')), false);
  });

  it('the host cannot kick themselves', () => {
    assert.equal(canKickFromTable(state(), 'host', player('host')), false);
  });

  it('refuses a connected player while a hand is live', () => {
    assert.equal(
      canKickFromTable(state({ phase: 'IN_HAND' }), 'host', player('guest', { connected: true })),
      false,
    );
  });

  it('allows an offline player to be removed mid-hand so a seat cannot freeze the table', () => {
    assert.equal(
      canKickFromTable(state({ phase: 'IN_HAND' }), 'host', player('guest', { connected: false })),
      true,
    );
  });
});
