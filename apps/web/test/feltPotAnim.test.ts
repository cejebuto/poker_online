import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignPayoutCredits,
  buildPotFlights,
  potLabel,
  resolvePotList,
} from '../src/features/feltPotAnim.js';

describe('feltPotAnim', () => {
  it('labels main and side pots', () => {
    assert.equal(potLabel(0), 'Bote principal');
    assert.equal(potLabel(1), 'Side pot 1');
    assert.equal(potLabel(2), 'Side pot 2');
  });

  it('falls back to potTotal when pots are empty', () => {
    assert.deepEqual(resolvePotList([], 120), [
      { amount: 120, eligibleSeats: [] },
    ]);
    assert.deepEqual(resolvePotList([], 0), []);
  });

  it('vanishes every pot when hero did not win', () => {
    const flights = buildPotFlights({
      pots: [
        { amount: 100, eligibleSeats: [0, 1] },
        { amount: 40, eligibleSeats: [1] },
      ],
      potTotal: 140,
      mySeat: 0,
      winners: [1],
      myPayout: 0,
    });
    assert.equal(flights.every((f) => f.outcome === 'vanish'), true);
    assert.equal(
      flights.every((f) => f.credit === 0),
      true,
    );
  });

  it('magnets eligible pots and vanishes side pots for other winners', () => {
    const flights = buildPotFlights({
      pots: [
        { amount: 100, eligibleSeats: [0, 1] },
        { amount: 40, eligibleSeats: [1] },
      ],
      potTotal: 140,
      mySeat: 0,
      winners: [0, 1],
      myPayout: 100,
    });
    assert.equal(flights[0]!.outcome, 'magnet');
    assert.equal(flights[1]!.outcome, 'vanish');
    assert.equal(flights[0]!.credit, 100);
    assert.equal(flights[1]!.credit, 0);
  });

  it('splits credits across magnet pots without losing chips to rounding', () => {
    const base = [
      {
        key: 'pot-0',
        label: 'Bote principal',
        amount: 100,
        outcome: 'magnet' as const,
        credit: 0,
      },
      {
        key: 'pot-1',
        label: 'Side pot 1',
        amount: 50,
        outcome: 'magnet' as const,
        credit: 0,
      },
    ];
    const out = assignPayoutCredits(base, 99);
    assert.equal(
      out.reduce((s, f) => s + f.credit, 0),
      99,
    );
  });
});
