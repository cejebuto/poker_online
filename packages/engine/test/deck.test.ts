import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDeck, deal, parseCard, parseCards, shuffle } from '../src/cards/deck.js';
import { createSeededRng } from '../src/rng.js';

describe('deck', () => {
  it('has 52 unique cards', () => {
    const deck = createDeck();
    assert.equal(deck.length, 52);
    const codes = new Set(deck.map((c) => `${c.rank}${c.suit}`));
    assert.equal(codes.size, 52);
  });

  it('shuffle is deterministic with same seed', () => {
    const a = shuffle(createDeck(), createSeededRng(42));
    const b = shuffle(createDeck(), createSeededRng(42));
    assert.deepEqual(a, b);
    const c = shuffle(createDeck(), createSeededRng(7));
    assert.notDeepEqual(a, c);
  });

  it('deal gives 2 holes each + 5 community', () => {
    const shuffled = shuffle(createDeck(), createSeededRng(1));
    const result = deal(shuffled, { seats: 3, burn: true });
    assert.equal(result.holes.length, 3);
    for (const h of result.holes) assert.equal(h.length, 2);
    assert.equal(result.community.length, 5);
    assert.equal(result.burned.length, 3);
  });

  it('parseCard understands short codes', () => {
    assert.deepEqual(parseCard('As'), { rank: 'A', suit: 'spades' });
    assert.deepEqual(parseCard('10H'), { rank: '10', suit: 'hearts' });
    assert.deepEqual(parseCard('Td'), { rank: '10', suit: 'diamonds' });
    assert.equal(parseCards('As Kd').length, 2);
  });
});
