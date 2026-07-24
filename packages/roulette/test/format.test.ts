import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatChips, parseChipInput } from '../src/format.js';
import { createSeededRng, pickPocketIndex } from '../src/rng.js';
import { POCKET_COUNT } from '../src/wheel.js';

describe('chip format (K/M)', () => {
  it('compacts thousands and millions', () => {
    assert.equal(formatChips(100), '0.1K');
    assert.equal(formatChips(1000), '1K');
    assert.equal(formatChips(10_000), '10K');
    assert.equal(formatChips(10_000_000), '10M');
    assert.equal(formatChips(0), '0');
  });

  it('parses bare numbers as kilos and honours K/M', () => {
    assert.equal(parseChipInput('20'), 20_000);
    assert.equal(parseChipInput('0.1'), 100);
    assert.equal(parseChipInput('2M'), 2_000_000);
    assert.equal(parseChipInput(''), null);
    assert.equal(parseChipInput('abc'), null);
  });
});

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    assert.equal(a(), b());
  });

  it('picks an in-range pocket', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 200; i++) {
      const idx = pickPocketIndex(rng, POCKET_COUNT);
      assert.ok(idx >= 0 && idx < POCKET_COUNT);
    }
  });
});
