import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RoomSummary } from '@poker/shared';
import { filterRooms, matchesQuery, MAX_ACTIVE_ROOMS } from '../src/features/roomFilter.js';

function room(name: string, code: string, overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    roomId: `room_${code}`,
    code,
    name,
    players: 2,
    maxPlayers: 6,
    phase: 'LOBBY',
    hasPassword: true,
    smallBlind: 25,
    bigBlind: 50,
    ...overrides,
  };
}

const mesa = room('Mesa de César', 'PJZWRV');

describe('room search filter', () => {
  it('matches everything when the query is blank', () => {
    assert.equal(matchesQuery(mesa, ''), true);
    assert.equal(matchesQuery(mesa, '   '), true);
  });

  it('matches part of the name regardless of case', () => {
    assert.equal(matchesQuery(mesa, 'mesa'), true);
    assert.equal(matchesQuery(mesa, 'MESA DE'), true);
  });

  it('matches the code even when typed in lowercase', () => {
    assert.equal(matchesQuery(mesa, 'pjzwrv'), true);
    assert.equal(matchesQuery(mesa, 'ZWR'), true);
  });

  it('ignores accents in both directions', () => {
    assert.equal(matchesQuery(mesa, 'cesar'), true);
    assert.equal(matchesQuery(room('Mesa de Cesar', 'AAAAAA'), 'césar'), true);
  });

  it('ignores surrounding whitespace', () => {
    assert.equal(matchesQuery(mesa, '  cesar  '), true);
  });

  it('rejects a query that appears nowhere', () => {
    assert.equal(matchesQuery(mesa, 'poker night'), false);
  });

  it('filters a list down to the matches, preserving order', () => {
    const rooms = [room('Alfa', 'AAAAAA'), room('Beta', 'BBBBBB'), room('Alfajor', 'CCCCCC')];
    assert.deepEqual(
      filterRooms(rooms, 'alfa').map((r) => r.name),
      ['Alfa', 'Alfajor'],
    );
  });

  it(`caps visible rooms at ${MAX_ACTIVE_ROOMS}`, () => {
    const rooms = Array.from({ length: 8 }, (_, i) =>
      room(`Mesa ${i}`, `CODE${i}`.slice(0, 6).padEnd(6, 'X')),
    );
    assert.equal(filterRooms(rooms, '').length, MAX_ACTIVE_ROOMS);
    assert.equal(MAX_ACTIVE_ROOMS, 5);
  });
});
