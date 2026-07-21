import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardCode, isRedSuit, RANKS, SUITS } from '../src/cards.js';

describe('cards', () => {
  it('has 4 suits and 13 ranks', () => {
    assert.equal(SUITS.length, 4);
    assert.equal(RANKS.length, 13);
  });

  it('cardCode follows AS / 10H convention', () => {
    assert.equal(cardCode({ rank: 'A', suit: 'spades' }), 'AS');
    assert.equal(cardCode({ rank: '10', suit: 'hearts' }), '10H');
  });

  it('isRedSuit', () => {
    assert.equal(isRedSuit('hearts'), true);
    assert.equal(isRedSuit('clubs'), false);
  });
});
