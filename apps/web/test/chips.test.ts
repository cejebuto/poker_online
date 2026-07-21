import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  barsValue,
  breakIntoChips,
  clampBetAmount,
  encodeBars,
  encodeStackVisual,
  MAX_STACK_HEIGHT,
} from '../src/chips/denominations.js';

describe('chip encoding', () => {
  it('breaks amount into denominations', () => {
    const cols = breakIntoChips(138);
    const total = cols.reduce((s, c) => s + c.denom * c.count, 0);
    assert.equal(total, 138);
  });

  it('caps isometric column height', () => {
    const v = encodeStackVisual(MAX_STACK_HEIGHT * 25 + 50);
    for (const col of v.columns) {
      assert.ok(col.count <= MAX_STACK_HEIGHT);
    }
  });

  it('uses bars 100 / 1000 / 10000 with max 999', () => {
    const bars = encodeBars(12_345_678);
    assert.ok(bars.length <= 3);
    for (const b of bars) {
      assert.ok(b.count <= 999);
      assert.ok([100, 1000, 10000].includes(b.multiplier));
    }
    assert.ok(barsValue(bars) <= 12_345_678);
    assert.ok(barsValue(bars) > 0);
  });

  it('large stack uses bars preferred path', () => {
    const v = encodeStackVisual(250_000);
    assert.ok(v.bars.length > 0);
    const reconstructed =
      v.bars.reduce((s, b) => s + b.multiplier * b.count, 0) +
      v.columns.reduce((s, c) => s + c.denom * c.count, 0) +
      v.remainder;
    assert.equal(reconstructed, 250_000);
  });
});

describe('clampBetAmount', () => {
  const base = {
    toCall: 50,
    minRaise: 50,
    currentBet: 50,
    myBetThisRound: 0,
    stack: 500,
  };

  it('never exceeds stack', () => {
    assert.equal(clampBetAmount({ ...base, amount: 9999 }), 500);
  });

  it('bumps short raise to min raise when not all-in', () => {
    // call is 50; trying to raise to 60 should become 100 (50+50)
    assert.equal(clampBetAmount({ ...base, amount: 60 }), 100);
  });

  it('allows short all-in below min raise', () => {
    assert.equal(
      clampBetAmount({ ...base, stack: 70, amount: 70 }),
      70,
    );
  });

  it('allows exact call', () => {
    assert.equal(clampBetAmount({ ...base, amount: 50 }), 50);
  });
});
