import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REVEAL_STAGGER_MS, revealDelays } from '../src/cards/revealTiming.js';

describe('revealDelays', () => {
  it('has nothing to turn on a dry board', () => {
    assert.deepEqual(revealDelays(0, 0), []);
  });

  it('staggers a flop card by card', () => {
    assert.deepEqual(revealDelays(0, 3, 160), [0, 160, 320]);
  });

  it('leaves the flop alone when the turn lands', () => {
    assert.deepEqual(revealDelays(3, 4, 160), [null, null, null, 0]);
  });

  it('leaves flop and turn alone when the river lands', () => {
    assert.deepEqual(revealDelays(4, 5, 160), [null, null, null, null, 0]);
  });

  it('turns everything over when a view mounts mid-hand', () => {
    assert.deepEqual(revealDelays(0, 5, 100), [0, 100, 200, 300, 400]);
  });

  it('animates nothing when the board shrinks into a new hand', () => {
    assert.deepEqual(revealDelays(5, 0), []);
  });

  it('ships a default stagger', () => {
    assert.deepEqual(revealDelays(0, 2), [0, REVEAL_STAGGER_MS]);
  });
});
