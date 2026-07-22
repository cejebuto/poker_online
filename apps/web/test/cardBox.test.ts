import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CardSize } from '@poker/shared';
import { cardBox, HALF_VISIBLE_RATIO } from '../src/cards/cardBox.js';
import { CARD_PX } from '../src/cards/CardTheme.js';

const SIZES: CardSize[] = ['sm', 'md', 'lg'];

describe('cardBox — full card', () => {
  it('leaves the shipped dimensions untouched', () => {
    for (const size of SIZES) {
      assert.deepEqual(cardBox(size), { ...CARD_PX[size], innerScale: 1 }, size);
    }
  });

  it('ignores halfScale while half mode is off', () => {
    for (const size of SIZES) {
      assert.deepEqual(cardBox(size, { half: false, scale: 2 }), cardBox(size), size);
    }
  });
});

describe('cardBox — half card', () => {
  it('is wider and shorter than the full card, which is the whole point', () => {
    for (const size of SIZES) {
      const full = cardBox(size);
      const half = cardBox(size, { half: true, scale: 1.45 });
      assert.ok(half.w > full.w, `${size} should get wider`);
      assert.ok(half.h < full.h, `${size} should get shorter`);
    }
  });

  it('shows the configured share of the card height', () => {
    const half = cardBox('sm', { half: true, scale: 1 });
    assert.equal(half.h, Math.round(CARD_PX.sm.h * HALF_VISIBLE_RATIO));
    assert.equal(half.w, CARD_PX.sm.w, 'width only grows with the scale');
  });

  it('reports the scale so the caller can magnify the artwork inside', () => {
    assert.equal(cardBox('lg', { half: true, scale: 1.35 }).innerScale, 1.35);
    assert.equal(cardBox('lg', { half: true }).innerScale, 1);
  });

  it('rounds to whole pixels so a row of cards stays aligned', () => {
    for (const size of SIZES) {
      const box = cardBox(size, { half: true, scale: 1.45 });
      assert.equal(box.w, Math.round(box.w), `${size} width`);
      assert.equal(box.h, Math.round(box.h), `${size} height`);
    }
  });

  it('grows monotonically with the scale', () => {
    const small = cardBox('sm', { half: true, scale: 1.2 });
    const big = cardBox('sm', { half: true, scale: 1.6 });
    assert.ok(big.w > small.w);
    assert.ok(big.h > small.h);
  });

  it('never returns a zero or negative box', () => {
    const box = cardBox('sm', { half: true, scale: 0 });
    assert.ok(box.w > 0, `width was ${box.w}`);
    assert.ok(box.h > 0, `height was ${box.h}`);
  });
});
