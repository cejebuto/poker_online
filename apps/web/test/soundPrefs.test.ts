import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSfxMuted } from '../src/juice/soundPrefs.js';

describe('resolveSfxMuted', () => {
  it('defaults to sound on when nothing stored', () => {
    assert.equal(resolveSfxMuted(null), false);
    assert.equal(resolveSfxMuted(''), false);
    assert.equal(resolveSfxMuted('0'), false);
    assert.equal(resolveSfxMuted('false'), false);
  });

  it('treats 1 / true as muted', () => {
    assert.equal(resolveSfxMuted('1'), true);
    assert.equal(resolveSfxMuted('true'), true);
  });
});
