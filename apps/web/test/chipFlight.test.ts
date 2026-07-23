import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chipPitch,
  diffSeatBets,
  MAX_CHIP_TOKENS,
  planChipTokens,
  snapshotSeatBets,
  totalFlightMs,
} from '../src/juice/chipFlight.js';
import { CHIP_COLORS } from '../src/chips/denominations.js';

const valueOf = (tokens: ReturnType<typeof planChipTokens>) =>
  tokens.reduce((sum, t) => sum + t.denom, 0);

describe('planChipTokens', () => {
  it('has nothing to fly for an empty pot', () => {
    assert.deepEqual(planChipTokens(0), []);
    assert.deepEqual(planChipTokens(-50), []);
  });

  it('flies one token per real chip while the amount is small', () => {
    const tokens = planChipTokens(130);
    // 130 = 100 + 25 + 5
    assert.deepEqual(
      tokens.map((t) => t.denom),
      [100, 25, 5],
    );
    assert.equal(valueOf(tokens), 130);
  });

  it('carries the palette of each denomination', () => {
    const [token] = planChipTokens(500);
    assert.equal(token?.denom, 500);
    assert.equal(token?.face, CHIP_COLORS[500].face);
    assert.equal(token?.rim, CHIP_COLORS[500].rim);
  });

  it('caps the line so a huge pot does not spawn hundreds of nodes', () => {
    const tokens = planChipTokens(97_431);
    assert.ok(tokens.length <= MAX_CHIP_TOKENS, `got ${tokens.length}`);
    assert.ok(tokens.length > 0);
  });

  it('keeps the big denominations visible when it has to downsample', () => {
    const tokens = planChipTokens(97_431);
    const denoms = new Set(tokens.map((t) => t.denom));
    assert.ok(denoms.has(1000), 'the pot is mostly 1000s — they must lead');
    assert.ok(denoms.size > 1, 'a downsampled pot should still look mixed');
  });

  it('respects a custom cap', () => {
    assert.ok(planChipTokens(97_431, { max: 4 }).length <= 4);
    assert.equal(planChipTokens(5, { max: 4 }).length, 1);
  });

  it('staggers the line so chips arrive one by one', () => {
    const tokens = planChipTokens(300, { staggerMs: 70 });
    assert.deepEqual(
      tokens.map((t) => t.delayMs),
      tokens.map((_, i) => i * 70),
    );
  });

  it('scatters within bounds and stays deterministic', () => {
    const tokens = planChipTokens(4321);
    for (const t of tokens) {
      assert.ok(t.spread >= -1 && t.spread <= 1, `spread ${t.spread}`);
    }
    assert.deepEqual(planChipTokens(4321), tokens);
  });
});

describe('totalFlightMs', () => {
  it('is zero with nothing in the air', () => {
    assert.equal(totalFlightMs([], 700), 0);
  });

  it('waits for the last chip to land', () => {
    const tokens = planChipTokens(300, { staggerMs: 70 });
    const last = tokens[tokens.length - 1]!;
    assert.equal(totalFlightMs(tokens, 700), last.delayMs + 700);
  });
});

describe('chipPitch', () => {
  it('walks up the line', () => {
    assert.equal(chipPitch(0), 1);
    assert.ok(chipPitch(3) > chipPitch(1));
  });

  it('stops climbing so a long line does not turn into a whistle', () => {
    assert.equal(chipPitch(40), chipPitch(14));
  });
});

describe('snapshotSeatBets', () => {
  it('keys commitments by seat and skips the ones without a seat', () => {
    assert.deepEqual(
      snapshotSeatBets([
        { seat: 0, betThisRound: 50 },
        { seat: 2, betThisRound: 0 },
        { seat: null, betThisRound: 999 },
        { seat: 3 },
      ]),
      { 0: 50, 2: 0, 3: 0 },
    );
  });
});

describe('diffSeatBets', () => {
  it('reports the seats that put chips in', () => {
    assert.deepEqual(diffSeatBets({ 0: 0, 1: 20 }, { 0: 100, 1: 20 }), [
      { seat: 0, delta: 100 },
    ]);
  });

  it('ignores the reset at the end of a street — that is not a bet', () => {
    assert.deepEqual(diffSeatBets({ 0: 100, 1: 100 }, { 0: 0, 1: 0 }), []);
  });

  it('sees a seat that only appears in the new snapshot', () => {
    assert.deepEqual(diffSeatBets({}, { 4: 30 }), [{ seat: 4, delta: 30 }]);
  });

  it('returns seats in a stable order', () => {
    assert.deepEqual(diffSeatBets({}, { 5: 10, 1: 10, 3: 10 }), [
      { seat: 1, delta: 10 },
      { seat: 3, delta: 10 },
      { seat: 5, delta: 10 },
    ]);
  });
});
