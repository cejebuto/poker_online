import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEngineInfo, ENGINE_VERSION } from '../src/index.js';

describe('engine package', () => {
  it('exports version info', () => {
    const info = getEngineInfo();
    assert.equal(info.name, 'poker-engine');
    assert.equal(info.version, ENGINE_VERSION);
  });
});
