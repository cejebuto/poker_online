import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignPayoutCredits,
  buildPotFlights,
  potLabel,
  potWinnerSeat,
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

  it('sends every pot to the winner seat when hero did not win', () => {
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
    assert.equal(
      flights.every((f) => f.outcome === 'seat' && f.toSeat === 1),
      true,
    );
    assert.equal(
      flights.every((f) => f.credit === 0),
      true,
    );
  });

  it('magnets eligible pots and hands side pots to their own winner', () => {
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
    assert.equal(flights[0]!.toSeat, 0);
    assert.equal(flights[1]!.outcome, 'seat');
    assert.equal(flights[1]!.toSeat, 1);
    assert.equal(flights[0]!.credit, 100);
    assert.equal(flights[1]!.credit, 0);
  });

  it('vanishes a pot nobody eligible won', () => {
    const flights = buildPotFlights({
      pots: [{ amount: 60, eligibleSeats: [2, 3] }],
      potTotal: 60,
      mySeat: 0,
      winners: [1],
      myPayout: 0,
    });
    assert.equal(flights[0]!.outcome, 'vanish');
    assert.equal(flights[0]!.toSeat, null);
  });

  it('never flies an empty pot anywhere', () => {
    const flights = buildPotFlights({
      pots: [{ amount: 0, eligibleSeats: [0, 1] }],
      potTotal: 0,
      mySeat: 0,
      winners: [0],
      myPayout: 0,
    });
    assert.equal(flights[0]!.outcome, 'vanish');
  });

  it('splits credits across magnet pots without losing chips to rounding', () => {
    const base = [
      {
        key: 'pot-0',
        label: 'Bote principal',
        amount: 100,
        outcome: 'magnet' as const,
        toSeat: 0,
        credit: 0,
      },
      {
        key: 'pot-1',
        label: 'Side pot 1',
        amount: 50,
        outcome: 'magnet' as const,
        toSeat: 0,
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

describe('potWinnerSeat', () => {
  const pot = { amount: 100, eligibleSeats: [0, 1, 2] };

  it('finds nobody when no winner is eligible', () => {
    assert.equal(potWinnerSeat(pot, [5]), null);
    assert.equal(potWinnerSeat(pot, []), null);
  });

  it('treats an empty eligibility list as everyone', () => {
    assert.equal(potWinnerSeat({ amount: 10, eligibleSeats: [] }, [4]), 4);
  });

  it('hands a split pot to whoever was paid most', () => {
    assert.equal(potWinnerSeat(pot, [0, 2], { 0: 40, 2: 60 }), 2);
  });

  it('breaks an even split by seat, so the target never flickers', () => {
    assert.equal(potWinnerSeat(pot, [2, 0], { 0: 50, 2: 50 }), 0);
  });
});
