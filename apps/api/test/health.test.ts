import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { HealthResponse } from '@poker/shared';

describe('health contract', () => {
  it('accepts ok payload shape', () => {
    const body: HealthResponse = { status: 'ok', postgres: 'up', redis: 'up' };
    assert.equal(body.status, 'ok');
  });
});
