import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RoomSummary } from '@poker/shared';
import { filterRooms, matchesQuery } from '../src/features/roomFilter.js';

function room(name: string, code: string): RoomSummary {
  return {
    roomId: `room_${code}`,
    code,
    name,
    players: 2,
    maxPlayers: 6,
    phase: 'LOBBY',
    hasPassword: true,
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
});
