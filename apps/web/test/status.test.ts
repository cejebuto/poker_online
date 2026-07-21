import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('web scaffold', () => {
  it('status labels exist', () => {
    const labels = ['conectado', 'conectando…', 'desconectado'];
    assert.equal(labels.length, 3);
  });
});
