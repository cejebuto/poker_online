import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCards } from '../src/cards/deck.js';
import {
  estimateEquity,
  exactRiverEquityVsOne,
  iterationsForStreet,
} from '../src/probability/monteCarlo.js';

describe('monte carlo equity', () => {
  it('iterations scale by street', () => {
    assert.ok(iterationsForStreet(0, 1) > iterationsForStreet(5, 1));
    assert.ok(iterationsForStreet(3, 3) >= iterationsForStreet(3, 1));
  });

  it('is deterministic with seed', () => {
    const hero = parseCards('As Ah');
    const community = parseCards('2c 7d 9h');
    const a = estimateEquity({
      hero,
      community,
      opponents: 1,
      iterations: 500,
      seed: 42,
    });
    const b = estimateEquity({
      hero,
      community,
      opponents: 1,
      iterations: 500,
      seed: 42,
    });
    assert.deepEqual(a, b);
  });

  it('pocket aces preflop beat random ~80%+ heads-up', () => {
    const r = estimateEquity({
      hero: parseCards('As Ah'),
      community: [],
      opponents: 1,
      iterations: 3000,
      seed: 7,
    });
    // AA vs random is ~85%; allow statistical slack
    assert.ok(r.winPct > 75, `winPct=${r.winPct}`);
    assert.ok(r.winPct < 95, `winPct=${r.winPct}`);
  });

  it('matches exact river equity within tolerance', () => {
    // Hero has nut flush on river
    const hero = parseCards('As Ks');
    const community = parseCards('2s 7s 9s Jd 3c');
    const exact = exactRiverEquityVsOne(hero, community);
    const mc = estimateEquity({
      hero,
      community,
      opponents: 1,
      iterations: 4000,
      seed: 99,
    });
    const diff = Math.abs(mc.winPct - exact.winPct);
    assert.ok(
      diff < 2.5,
      `MC ${mc.winPct.toFixed(2)} vs exact ${exact.winPct.toFixed(2)} (diff ${diff})`,
    );
  });

  it('never requires opponent cards as input', () => {
    // API only accepts hero + community + opponent count
    const r = estimateEquity({
      hero: parseCards('Qh Qd'),
      community: parseCards('2c 3d 8h'),
      opponents: 2,
      iterations: 200,
      seed: 1,
    });
    assert.equal(r.wins + r.ties + r.losses, r.iterations);
  });
});
