import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicPlayer } from '@poker/shared';
import { describeAutoAction, describeHandResult } from '../src/features/handResult.js';

function player(seat: number, displayName: string, avatar?: string): PublicPlayer {
  return {
    playerId: `p${seat}`,
    displayName,
    ...(avatar ? { avatar } : {}),
    role: 'player',
    seat,
    stack: 1000,
    connected: true,
  };
}

const table = [player(0, 'cesar', '🃏'), player(1, 'maria', '🦊')];

describe('describeHandResult', () => {
  it('names the single winner and formats the payout in K', () => {
    const text = describeHandResult({ winners: [1], payouts: { 1: 15_000 } }, table);
    assert.equal(text, 'Ganó 🦊 maria · 15K');
  });

  it('formats fractional kilos', () => {
    const text = describeHandResult({ winners: [0], payouts: { 0: 500 } }, table);
    assert.equal(text, 'Ganó 🃏 cesar · 0.5K');
  });

  it('lists every winner when the pot is split', () => {
    const text = describeHandResult({ winners: [0, 1], payouts: { 0: 10_000, 1: 10_000 } }, table);
    assert.equal(text, 'Bote dividido: 🃏 cesar 10K · 🦊 maria 10K');
  });

  it('falls back to the seat number when the player already left', () => {
    const text = describeHandResult({ winners: [7], payouts: { 7: 30_000 } }, table);
    assert.equal(text, 'Ganó asiento 7 · 30K');
  });

  it('omits the avatar when the player has none', () => {
    const text = describeHandResult({ winners: [2], payouts: { 2: 5_000 } }, [
      ...table,
      player(2, 'ana'),
    ]);
    assert.equal(text, 'Ganó ana · 5K');
  });

  it('returns null when there are no winners to report', () => {
    assert.equal(describeHandResult({ winners: [], payouts: {} }, table), null);
  });

  it('omits a zero payout amount', () => {
    const text = describeHandResult({ winners: [1], payouts: { 1: 0 } }, table);
    assert.equal(text, 'Ganó 🦊 maria');
  });

  it('uses M for million-chip pots', () => {
    const text = describeHandResult({ winners: [1], payouts: { 1: 1_250_000 } }, table);
    assert.equal(text, 'Ganó 🦊 maria · 1.25M');
  });
});

describe('describeAutoAction', () => {
  it('addresses the player directly when it was their own seat', () => {
    const text = describeAutoAction({ seat: 0, action: 'fold', reason: 'timeout' }, table, 0);
    assert.equal(text, 'Se te acabó el tiempo · fold automático');
  });

  it('reports a timeout for another player by name', () => {
    const text = describeAutoAction({ seat: 1, action: 'check', reason: 'timeout' }, table, 0);
    assert.equal(text, '🦊 maria se quedó sin tiempo · check automático');
  });

  it('distinguishes a disconnect from a timeout', () => {
    const text = describeAutoAction({ seat: 1, action: 'fold', reason: 'disconnect' }, table, 0);
    assert.equal(text, '🦊 maria se desconectó · fold automático');
  });

  it('addresses the player directly on their own disconnect', () => {
    const text = describeAutoAction({ seat: 0, action: 'fold', reason: 'disconnect' }, table, 0);
    assert.equal(text, 'Te desconectaste · fold automático');
  });
});
