import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePlayViewMode } from '../src/features/viewMode.js';

describe('play view mode', () => {
  it('defaults to the felt table view for a new device', () => {
    assert.equal(resolvePlayViewMode(null), 'felt');
  });

  it('honours an explicit preference for the classic view', () => {
    assert.equal(resolvePlayViewMode('classic'), 'classic');
  });

  it('honours an explicit preference for the felt view', () => {
    assert.equal(resolvePlayViewMode('felt'), 'felt');
  });

  it('falls back to felt when the stored value is unrecognised', () => {
    assert.equal(resolvePlayViewMode('garbage'), 'felt');
    assert.equal(resolvePlayViewMode(''), 'felt');
  });
});
