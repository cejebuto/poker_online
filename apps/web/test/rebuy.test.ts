import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canRebuyPlayer } from '../src/features/rebuy.js';

const broke = {
  stack: 0,
  status: 'SITTING_OUT' as const,
  rebuyCount: 0,
  role: 'player' as const,
};

describe('canRebuyPlayer', () => {
  it('allows cash rebuy when broke between hands', () => {
    assert.equal(
      canRebuyPlayer(broke, {
        phase: 'LOBBY',
        mode: 'cash',
        allowRebuy: true,
        rebuyMax: 3,
      }),
      true,
    );
  });

  it('allows rebuy when allowRebuy is omitted (cash default)', () => {
    assert.equal(
      canRebuyPlayer(broke, { phase: 'LOBBY', mode: 'cash', rebuyMax: 3 }),
      true,
    );
  });

  it('blocks rebuy during a hand', () => {
    assert.equal(
      canRebuyPlayer(broke, {
        phase: 'IN_HAND',
        mode: 'cash',
        allowRebuy: true,
        rebuyMax: 3,
      }),
      false,
    );
  });

  it('blocks tournament rebuy', () => {
    assert.equal(
      canRebuyPlayer(broke, {
        phase: 'LOBBY',
        mode: 'tournament',
        allowRebuy: false,
        rebuyMax: 0,
      }),
      false,
    );
  });

  it('blocks when rebuy is disabled', () => {
    assert.equal(
      canRebuyPlayer(broke, {
        phase: 'LOBBY',
        mode: 'cash',
        allowRebuy: false,
        rebuyMax: 3,
      }),
      false,
    );
  });

  it('blocks when the player still has chips', () => {
    assert.equal(
      canRebuyPlayer(
        { ...broke, stack: 100, status: 'ACTIVE' },
        { phase: 'LOBBY', mode: 'cash', allowRebuy: true, rebuyMax: 3 },
      ),
      false,
    );
  });

  it('blocks when rebuy cap is reached', () => {
    assert.equal(
      canRebuyPlayer(
        { ...broke, rebuyCount: 3 },
        { phase: 'LOBBY', mode: 'cash', allowRebuy: true, rebuyMax: 3 },
      ),
      false,
    );
  });
});
