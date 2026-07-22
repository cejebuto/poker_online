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
import {
  amountAfterScrubSteps,
  isSwipeFlip,
  isThrowConfirm,
  scrubStepsFromDelta,
  SWIPE_FLIP_PX,
  THROW_THRESHOLD_PX,
  throwProgress,
} from '../src/chips/gestureMath.js';

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

describe('gestureMath (betting zones)', () => {
  it('confirms throw only past threshold', () => {
    assert.equal(isThrowConfirm(THROW_THRESHOLD_PX), false);
    assert.equal(isThrowConfirm(THROW_THRESHOLD_PX + 1), true);
    assert.equal(isThrowConfirm(0), false);
    assert.equal(isThrowConfirm(-20), false);
  });

  it('maps throw progress 0..1', () => {
    assert.equal(throwProgress(0), 0);
    assert.equal(throwProgress(THROW_THRESHOLD_PX / 2), 0.5);
    assert.equal(throwProgress(THROW_THRESHOLD_PX * 3), 1);
  });

  it('scrubs in discrete pixel steps without double-counting', () => {
    const first = scrubStepsFromDelta(50, 0, 24);
    assert.equal(first.steps, 2);
    assert.equal(first.deltaSteps, 2);
    const second = scrubStepsFromDelta(55, first.nextLastStep, 24);
    assert.equal(second.deltaSteps, 0);
    const third = scrubStepsFromDelta(72, second.nextLastStep, 24);
    assert.equal(third.steps, 3);
    assert.equal(third.deltaSteps, 1);
  });

  it('applies scrub step amounts', () => {
    assert.equal(amountAfterScrubSteps(100, 2, 50), 200);
    assert.equal(amountAfterScrubSteps(100, -1, 50), 50);
    assert.equal(amountAfterScrubSteps(100, 0, 50), 100);
  });

  it('flips hole cards on a swipe in either direction', () => {
    assert.equal(isSwipeFlip(SWIPE_FLIP_PX + 1), true, 'swipe right');
    assert.equal(isSwipeFlip(-(SWIPE_FLIP_PX + 1)), true, 'swipe left');
  });

  it('ignores a nudge that never reached the flip threshold', () => {
    assert.equal(isSwipeFlip(SWIPE_FLIP_PX), false, 'exactly at the threshold is not a swipe');
    assert.equal(isSwipeFlip(0), false);
    assert.equal(isSwipeFlip(-12), false);
  });
});
