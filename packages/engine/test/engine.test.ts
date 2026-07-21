import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEngineInfo } from '../src/index.js';

describe('engine scaffold', () => {
  it('exposes version info', () => {
    const info = getEngineInfo();
    assert.equal(info.name, 'poker-engine');
    assert.equal(typeof info.version, 'string');
  });
});
