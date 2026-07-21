import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCards } from '../src/cards/deck.js';
import {
  compareHands,
  evaluateHand,
  HandCategory,
  findWinners,
} from '../src/evaluator/evaluate.js';

function cat(codes: string) {
  return evaluateHand(parseCards(codes)).category;
}

function score(codes: string) {
  return evaluateHand(parseCards(codes)).score;
}

describe('evaluator', () => {
  it('classifies all categories', () => {
    assert.equal(cat('As Ks Qs Js 10s'), HandCategory.ROYAL_FLUSH);
    assert.equal(cat('9h 8h 7h 6h 5h'), HandCategory.STRAIGHT_FLUSH);
    assert.equal(cat('Ah Ad Ac As Kh'), HandCategory.FOUR_OF_A_KIND);
    assert.equal(cat('Ah Ad Ac Kh Kd'), HandCategory.FULL_HOUSE);
    assert.equal(cat('Ah 9h 7h 4h 2h'), HandCategory.FLUSH);
    assert.equal(cat('9c 8d 7h 6s 5c'), HandCategory.STRAIGHT);
    assert.equal(cat('Ah Ad Ac 9s 2c'), HandCategory.THREE_OF_A_KIND);
    assert.equal(cat('Ah Ad Kh Kd 2c'), HandCategory.TWO_PAIR);
    assert.equal(cat('Ah Ad 9s 5c 2h'), HandCategory.PAIR);
    assert.equal(cat('Ah Kd 9s 5c 2h'), HandCategory.HIGH_CARD);
  });

  it('detects wheel straight A-2-3-4-5', () => {
    const ev = evaluateHand(parseCards('As 2d 3h 4c 5s'));
    assert.equal(ev.category, HandCategory.STRAIGHT);
    assert.equal(ev.score[1], 5);
  });

  it('wheel loses to 6-high straight', () => {
    const wheel = score('As 2d 3h 4c 5s');
    const six = score('6s 5d 4h 3c 2s');
    assert.ok(compareHands(six, wheel) > 0);
  });

  it('kicker decides pair ties', () => {
    const a = score('Ah Ad Ks 9c 2h');
    const b = score('As Ac Qd 9h 2c');
    assert.ok(compareHands(a, b) > 0);
  });

  it('best of 7 cards', () => {
    // hole + board forms full house
    const ev = evaluateHand(parseCards('Ah Ad Kh Kd 2c 9s Ac'));
    assert.equal(ev.category, HandCategory.FULL_HOUSE);
  });

  it('findWinners detects exact ties', () => {
    const community = parseCards('2c 3d 4h 9s Kc');
    const { seats } = findWinners(
      [
        { seat: 0, hole: parseCards('Ah Ad') },
        { seat: 1, hole: parseCards('As Ac') },
      ],
      community,
    );
    assert.deepEqual(seats.sort(), [0, 1]);
  });

  it('four of a kind beats full house', () => {
    assert.ok(
      compareHands(score('Ah Ad Ac As 2h'), score('Kh Kd Kc Qh Qd')) > 0,
    );
  });
});
