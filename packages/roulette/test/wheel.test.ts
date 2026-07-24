import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AMERICAN_ORDER,
  BOARD_KEYS,
  POCKETS,
  POCKET_COUNT,
  colorForKey,
  columnOf,
  dozenOf,
  indexOfKey,
  pocketByIndex,
} from '../src/wheel.js';

describe('american wheel', () => {
  it('has 38 pockets including 0 and 00', () => {
    assert.equal(POCKET_COUNT, 38);
    assert.ok(AMERICAN_ORDER.includes('0'));
    assert.ok(AMERICAN_ORDER.includes('00'));
    assert.equal(new Set(AMERICAN_ORDER).size, 38);
  });

  it('board keys are 0, 00, then 1..36', () => {
    assert.equal(BOARD_KEYS.length, 38);
    assert.deepEqual(BOARD_KEYS.slice(0, 3), ['0', '00', '1']);
    assert.equal(BOARD_KEYS.at(-1), '36');
  });

  it('colours the zeroes green and splits reds/blacks 18/18', () => {
    assert.equal(colorForKey('0'), 'green');
    assert.equal(colorForKey('00'), 'green');
    const reds = POCKETS.filter((p) => p.color === 'red').length;
    const blacks = POCKETS.filter((p) => p.color === 'black').length;
    assert.equal(reds, 18);
    assert.equal(blacks, 18);
    assert.equal(colorForKey('1'), 'red');
    assert.equal(colorForKey('2'), 'black');
  });

  it('wraps pocket index and round-trips key lookup', () => {
    assert.equal(pocketByIndex(0).key, '0');
    assert.equal(pocketByIndex(POCKET_COUNT).key, '0');
    assert.equal(indexOfKey(pocketByIndex(19).key), 19);
  });

  it('maps dozens and columns', () => {
    assert.equal(dozenOf(1), 1);
    assert.equal(dozenOf(24), 2);
    assert.equal(dozenOf(36), 3);
    assert.equal(dozenOf(0), null);
    assert.equal(columnOf(1), 1);
    assert.equal(columnOf(2), 2);
    assert.equal(columnOf(3), 3);
  });
});
