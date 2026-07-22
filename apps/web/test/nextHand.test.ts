import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicRoomState } from '@poker/shared';
import { isBetweenHands } from '../src/features/NextHandPrompt.js';

function room(patch: Partial<PublicRoomState>): PublicRoomState {
  return {
    roomId: 'room_1',
    code: 'ABCDEF',
    phase: 'LOBBY',
    config: {
      name: 'Mesa',
      maxPlayers: 6,
      startingStack: 1000,
      mode: 'cash',
      smallBlind: 5,
      bigBlind: 10,
    },
    hostPlayerId: 'p1',
    players: [],
    version: 1,
    joinUrl: 'http://x/join/room_1',
    effectiveSmallBlind: 5,
    effectiveBigBlind: 10,
    ...patch,
  };
}

describe('isBetweenHands', () => {
  it('is true once the table is back in the lobby with a pending next hand', () => {
    assert.equal(isBetweenHands(room({ nextHand: { ready: 0, needed: 2 } })), true);
  });

  it('is false while a hand is being played', () => {
    assert.equal(
      isBetweenHands(room({ phase: 'IN_HAND', nextHand: { ready: 0, needed: 2 } })),
      false,
    );
  });

  it('is false when nobody is being waited on', () => {
    assert.equal(isBetweenHands(room({})), false);
  });

  it('is false once the game is over', () => {
    assert.equal(
      isBetweenHands(room({ phase: 'FINISHED', nextHand: { ready: 0, needed: 2 } })),
      false,
    );
  });
});
