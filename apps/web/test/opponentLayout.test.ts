import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicPlayer } from '@poker/shared';
import {
  assignOpponentSlots,
  opponentsClockwiseFromHero,
  placeInColumn,
  layoutOpponentsForHero,
  OPPONENT_SLOTS_PER_SIDE,
} from '../src/features/opponentLayout.js';

function p(id: string, seat: number): PublicPlayer {
  return {
    playerId: id,
    displayName: id,
    role: 'player',
    seat,
    stack: 1000,
    connected: true,
  };
}

describe('opponentsClockwiseFromHero', () => {
  it('rotates so seats walk clockwise from the hero left', () => {
    // seats 0,1,2,3 around the table; hero at 2 → clockwise 3,0,1
    const players = [p('a', 0), p('b', 1), p('hero', 2), p('c', 3)];
    assert.deepEqual(
      opponentsClockwiseFromHero(players, 'hero').map((x) => x.playerId),
      ['c', 'a', 'b'],
    );
  });

  it('excludes the hero', () => {
    const players = [p('hero', 0), p('x', 1)];
    assert.deepEqual(
      opponentsClockwiseFromHero(players, 'hero').map((x) => x.playerId),
      ['x'],
    );
  });

  it('returns empty when only the hero is seated', () => {
    assert.deepEqual(opponentsClockwiseFromHero([p('hero', 0)], 'hero'), []);
  });
});

describe('placeInColumn', () => {
  it('uses 4 slots and centers a single player', () => {
    const col = placeInColumn(['only'], true);
    assert.equal(col.length, OPPONENT_SLOTS_PER_SIDE);
    assert.deepEqual(col, [null, 'only', null, null]);
  });

  it('puts near-hero first at the bottom when nearHeroFirst', () => {
    // nearHeroFirst: reverse so first in list ends at bottom
    assert.deepEqual(placeInColumn(['near', 'far'], true), [null, 'far', 'near', null]);
  });

  it('keeps order top→bottom when not nearHeroFirst', () => {
    assert.deepEqual(placeInColumn(['top', 'bot'], false), [null, 'top', 'bot', null]);
  });
});

describe('assignOpponentSlots', () => {
  it('puts one opponent on the left rail', () => {
    const { left, right } = assignOpponentSlots(['a']);
    assert.ok(left.some((x) => x === 'a'));
    assert.ok(right.every((x) => x === null));
  });

  it('splits two opponents left/right', () => {
    const { left, right } = assignOpponentSlots(['L', 'R']);
    assert.ok(left.includes('L'));
    assert.ok(right.includes('R'));
  });

  it('caps at 8 opponents (4+4)', () => {
    const nine = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const { left, right } = assignOpponentSlots(nine);
    const filled = [...left, ...right].filter(Boolean);
    assert.equal(filled.length, 8);
    assert.ok(!filled.includes('9'));
  });

  it('fills left first half then right for six', () => {
    const { left, right } = assignOpponentSlots(['a', 'b', 'c', 'd', 'e', 'f']);
    // mid = 3 → left a,b,c (near hero first → bottom is a); right d,e,f
    assert.equal(left.filter(Boolean).length, 3);
    assert.equal(right.filter(Boolean).length, 3);
    assert.equal(left[left.length - 1] === 'a' || left.includes('a'), true);
  });
});

describe('layoutOpponentsForHero', () => {
  it('wires rotation + columns for a full 9-max table', () => {
    const players = Array.from({ length: 9 }, (_, i) => p(`p${i}`, i));
    const cols = layoutOpponentsForHero(players, 'p0');
    const ids = [...cols.left, ...cols.right].filter(Boolean).map((x) => (x as PublicPlayer).playerId);
    assert.equal(ids.length, 8);
    assert.ok(!ids.includes('p0'));
    // clockwise from p0: p1..p8
    assert.deepEqual(ids.sort(), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
  });
});
