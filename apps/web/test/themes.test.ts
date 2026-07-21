import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardCode, RANKS, SUITS } from '@poker/shared';
import { expectedAssetKeys, normalizeAssetCode } from '../src/cards/assetConvention.js';
import { CARD_PX } from '../src/cards/CardTheme.js';

describe('card theme system', () => {
  it('expects 52 faces + back', () => {
    const keys = expectedAssetKeys();
    assert.equal(keys.length, 53);
    assert.ok(keys.includes('back'));
    assert.ok(keys.includes('AS'));
    assert.ok(keys.includes('10H'));
  });

  it('cardCode matches asset naming convention', () => {
    assert.equal(cardCode({ rank: 'A', suit: 'spades' }), 'AS');
    assert.equal(cardCode({ rank: '10', suit: 'hearts' }), '10H');
    assert.equal(cardCode({ rank: 'K', suit: 'diamonds' }), 'KD');
  });

  it('normalizeAssetCode accepts T as 10', () => {
    assert.equal(normalizeAssetCode('TH'), '10H');
    assert.equal(normalizeAssetCode('as'), 'AS');
    assert.equal(normalizeAssetCode('back'), 'back');
  });

  it('full deck has unique codes', () => {
    const codes = new Set<string>();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        codes.add(cardCode({ rank, suit }));
      }
    }
    assert.equal(codes.size, 52);
  });

  it('defines sm/md/lg pixel sizes', () => {
    assert.ok(CARD_PX.sm.w < CARD_PX.md.w);
    assert.ok(CARD_PX.md.w < CARD_PX.lg.w);
    assert.ok(CARD_PX.sm.h < CARD_PX.lg.h);
  });
});
