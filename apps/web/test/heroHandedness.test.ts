import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveHeroHandedness } from '../src/features/heroHandedness.js';

describe('hero handedness', () => {
  it('defaults to buttons on the right', () => {
    assert.equal(resolveHeroHandedness(null), 'right');
  });

  it('honours an explicit left preference', () => {
    assert.equal(resolveHeroHandedness('left'), 'left');
  });

  it('honours an explicit right preference', () => {
    assert.equal(resolveHeroHandedness('right'), 'right');
  });

  it('falls back to right when the stored value is unrecognised', () => {
    assert.equal(resolveHeroHandedness('garbage'), 'right');
    assert.equal(resolveHeroHandedness(''), 'right');
  });
});
