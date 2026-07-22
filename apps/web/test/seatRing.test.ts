import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicPlayer } from '@poker/shared';
import { orderedTableSeats, seatRingPositions } from '../src/features/seatRing.js';

function player(patch: Partial<PublicPlayer> & { playerId: string }): PublicPlayer {
  return {
    displayName: patch.playerId,
    role: 'player',
    seat: 0,
    stack: 1000,
    connected: true,
    ...patch,
  };
}

describe('seatRingPositions', () => {
  it('returns one point per seat for every table size we support', () => {
    for (let count = 2; count <= 9; count++) {
      assert.equal(seatRingPositions(count).length, count, `count ${count}`);
    }
  });

  it('keeps every seat inside the table', () => {
    for (let count = 2; count <= 9; count++) {
      for (const p of seatRingPositions(count)) {
        assert.ok(p.xPct >= 0 && p.xPct <= 100, `x out of bounds at ${count}: ${p.xPct}`);
        assert.ok(p.yPct >= 0 && p.yPct <= 100, `y out of bounds at ${count}: ${p.yPct}`);
      }
    }
  });

  it('seats the first player at the bottom center, facing the screen', () => {
    for (let count = 2; count <= 9; count++) {
      const first = seatRingPositions(count)[0]!;
      assert.equal(first.xPct, 50, `count ${count}`);
      assert.ok(first.yPct > 50, `count ${count} should be below center, got ${first.yPct}`);
    }
  });

  it('never stacks two seats on the same spot', () => {
    for (let count = 2; count <= 9; count++) {
      const keys = seatRingPositions(count).map((p) => `${p.xPct},${p.yPct}`);
      assert.equal(new Set(keys).size, count, `collision at ${count}`);
    }
  });

  it('goes clockwise: the second seat sits to the right of the first', () => {
    const [, second] = seatRingPositions(4);
    assert.ok(second!.xPct > 50, `expected x > 50, got ${second!.xPct}`);
  });

  it('has nothing to place for an empty or nonsense table', () => {
    assert.deepEqual(seatRingPositions(0), []);
    assert.deepEqual(seatRingPositions(-3), []);
  });

  it('puts a heads-up pair opposite each other', () => {
    const [bottom, top] = seatRingPositions(2);
    assert.equal(bottom!.xPct, 50);
    assert.equal(top!.xPct, 50);
    assert.ok(top!.yPct < 50, 'the second seat faces the first');
  });
});

describe('orderedTableSeats', () => {
  it('sorts by seat no matter how they arrive', () => {
    const seats = orderedTableSeats([
      player({ playerId: 'c', seat: 2 }),
      player({ playerId: 'a', seat: 0 }),
      player({ playerId: 'b', seat: 1 }),
    ]);
    assert.deepEqual(
      seats.map((p) => p.playerId),
      ['a', 'b', 'c'],
    );
  });

  it('leaves out the shared screen and anyone without a seat', () => {
    const seats = orderedTableSeats([
      player({ playerId: 'mesa', role: 'mesa', seat: null }),
      player({ playerId: 'watching', seat: null }),
      player({ playerId: 'seated', seat: 3 }),
    ]);
    assert.deepEqual(
      seats.map((p) => p.playerId),
      ['seated'],
    );
  });

  it('returns an empty list for an empty table', () => {
    assert.deepEqual(orderedTableSeats([]), []);
  });
});
