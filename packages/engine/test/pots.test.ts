import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { awardPots, buildSidePots, oddChipOrder } from '../src/pots/sidePots.js';

describe('side pots', () => {
  it('spec §9.3: A 100 all-in, B/C 300 → main 300 + side 400', () => {
    const pots = buildSidePots([
      { seat: 0, amount: 100, eligible: true },
      { seat: 1, amount: 300, eligible: true },
      { seat: 2, amount: 300, eligible: true },
    ]);
    assert.equal(pots.length, 2);
    assert.deepEqual(pots[0], { amount: 300, eligibleSeats: [0, 1, 2] });
    assert.deepEqual(pots[1], { amount: 400, eligibleSeats: [1, 2] });
    assert.equal(pots[0]!.amount + pots[1]!.amount, 700);
  });

  it('folded player contributes but is not eligible', () => {
    const pots = buildSidePots([
      { seat: 0, amount: 50, eligible: false },
      { seat: 1, amount: 100, eligible: true },
      { seat: 2, amount: 100, eligible: true },
    ]);
    assert.equal(pots[0]!.amount, 150); // 50*3
    assert.deepEqual(pots[0]!.eligibleSeats, [1, 2]);
    assert.equal(pots[1]!.amount, 100); // 50*2
    assert.deepEqual(pots[1]!.eligibleSeats, [1, 2]);
  });

  it('split even pot 300 → 150/150', () => {
    const payouts = awardPots(
      [{ amount: 300, eligibleSeats: [1, 3] }],
      () => [1, 3],
      oddChipOrder([1, 3], 0),
    );
    assert.equal(payouts.get(1), 150);
    assert.equal(payouts.get(3), 150);
  });

  it('odd chip goes to seat closest after button', () => {
    // button=0 → priority starts at lowest seat > 0
    const priority = oddChipOrder([1, 2, 3], 0);
    assert.deepEqual(priority, [1, 2, 3]);
    const payouts = awardPots(
      [{ amount: 100, eligibleSeats: [1, 2, 3] }],
      () => [1, 2, 3],
      priority,
    );
    // 100/3 = 33 each, remainder 1 → seat 1
    assert.equal(payouts.get(1), 34);
    assert.equal(payouts.get(2), 33);
    assert.equal(payouts.get(3), 33);
    assert.equal([...payouts.values()].reduce((a, b) => a + b, 0), 100);
  });
});
