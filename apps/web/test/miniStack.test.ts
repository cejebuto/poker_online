import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MINI_MAX_COLUMNS,
  MINI_MAX_PER_COLUMN,
  planMiniStack,
} from '../src/chips/miniStack.js';
import { CHIP_COLORS } from '../src/chips/denominations.js';

describe('planMiniStack', () => {
  it('draws nothing for an empty stack', () => {
    assert.deepEqual(planMiniStack(0), []);
    assert.deepEqual(planMiniStack(-10), []);
  });

  it('draws one disc per chip while the pile is small', () => {
    const cols = planMiniStack(3);
    assert.equal(cols.length, 1);
    assert.equal(cols[0]?.denom, 1);
    assert.equal(cols[0]?.discs, 3);
    assert.equal(cols[0]?.hidden, 0);
  });

  it('carries the palette of each denomination', () => {
    const [col] = planMiniStack(1000);
    assert.equal(col?.denom, 1000);
    assert.equal(col?.face, CHIP_COLORS[1000].face);
    assert.equal(col?.edge, CHIP_COLORS[1000].edge);
  });

  it('keeps the biggest denominations when it runs out of columns', () => {
    const cols = planMiniStack(1631); // 1000 + 500 + 100 + 25 + 5 + 1
    assert.ok(cols.length <= MINI_MAX_COLUMNS);
    assert.deepEqual(
      cols.map((c) => c.denom),
      [1000, 500, 100, 25],
    );
  });

  it('caps a tall column and reports what it left out', () => {
    const cols = planMiniStack(7000);
    const top = cols[0]!;
    assert.equal(top.denom, 1000);
    assert.equal(top.discs, MINI_MAX_PER_COLUMN);
    assert.equal(top.hidden, 7 - MINI_MAX_PER_COLUMN);
  });

  it('honours custom caps', () => {
    const cols = planMiniStack(1631, { maxColumns: 2, maxPerColumn: 1 });
    assert.equal(cols.length, 2);
    assert.ok(cols.every((c) => c.discs === 1));
  });
});
