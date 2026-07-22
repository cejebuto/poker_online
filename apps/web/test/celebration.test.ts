import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONFETTI_MAX,
  CONFETTI_MIN,
  confettiCount,
  confettiPieces,
  seedFromHandId,
} from '../src/features/celebration.js';

describe('confettiCount', () => {
  it('throws nothing at a player who won nothing', () => {
    assert.equal(confettiCount({ payout: 0, bigBlind: 10 }), 0);
    assert.equal(confettiCount({ payout: -50, bigBlind: 10 }), 0);
  });

  it('gives a floor of celebration to any win at all', () => {
    assert.equal(confettiCount({ payout: 1, bigBlind: 1000 }), CONFETTI_MIN);
  });

  it('throws more confetti the bigger the win is', () => {
    const small = confettiCount({ payout: 100, bigBlind: 10 });
    const mid = confettiCount({ payout: 400, bigBlind: 10 });
    const big = confettiCount({ payout: 800, bigBlind: 10 });
    assert.ok(small < mid, `${small} < ${mid}`);
    assert.ok(mid < big, `${mid} < ${big}`);
  });

  it('caps so a monster pot cannot bury the screen', () => {
    assert.equal(confettiCount({ payout: 10_000_000, bigBlind: 10 }), CONFETTI_MAX);
  });

  it('measures the win in big blinds, not in chips', () => {
    // 50 big blinds is 50 big blinds at any stake.
    assert.equal(
      confettiCount({ payout: 500, bigBlind: 10 }),
      confettiCount({ payout: 50_000, bigBlind: 1000 }),
    );
  });

  it('survives a nonsense big blind instead of dividing by zero', () => {
    assert.ok(Number.isFinite(confettiCount({ payout: 500, bigBlind: 0 })));
    assert.ok(confettiCount({ payout: 500, bigBlind: 0 }) <= CONFETTI_MAX);
  });
});

describe('confettiPieces', () => {
  it('makes exactly the requested number of pieces', () => {
    assert.equal(confettiPieces(40, 7).length, 40);
    assert.equal(confettiPieces(0, 7).length, 0);
  });

  it('is deterministic for a seed, so a re-render does not reshuffle mid-flight', () => {
    assert.deepEqual(confettiPieces(30, 123), confettiPieces(30, 123));
  });

  it('looks different for a different hand', () => {
    assert.notDeepEqual(confettiPieces(30, 1), confettiPieces(30, 2));
  });

  it('keeps every piece on screen', () => {
    for (const piece of confettiPieces(120, 99)) {
      assert.ok(piece.xPct >= 0 && piece.xPct <= 100, `x ${piece.xPct}`);
      assert.ok(piece.delay >= 0, `delay ${piece.delay}`);
      assert.ok(piece.duration > 0, `duration ${piece.duration}`);
      assert.ok(piece.color.startsWith('#'), `color ${piece.color}`);
    }
  });

  it('gives every piece a unique key', () => {
    const ids = confettiPieces(60, 5).map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('seedFromHandId', () => {
  it('turns a hand id into a stable number', () => {
    assert.equal(seedFromHandId('hand_abc'), seedFromHandId('hand_abc'));
    assert.notEqual(seedFromHandId('hand_abc'), seedFromHandId('hand_abd'));
  });

  it('copes with no hand at all', () => {
    assert.ok(Number.isFinite(seedFromHandId(undefined)));
  });
});
