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
  it('names the single winner and formats the payout', () => {
    const text = describeHandResult({ winners: [1], payouts: { 1: 15 } }, table);
    assert.equal(text, 'Ganó 🦊 maria · 15 fichas');
  });

  it('says "ficha" in singular for a payout of one', () => {
    const text = describeHandResult({ winners: [0], payouts: { 0: 1 } }, table);
    assert.equal(text, 'Ganó 🃏 cesar · 1 ficha');
  });

  it('lists every winner when the pot is split', () => {
    const text = describeHandResult({ winners: [0, 1], payouts: { 0: 10, 1: 10 } }, table);
    assert.equal(text, 'Bote dividido: 🃏 cesar 10 · 🦊 maria 10');
  });

  it('falls back to the seat number when the player already left', () => {
    const text = describeHandResult({ winners: [7], payouts: { 7: 30 } }, table);
    assert.equal(text, 'Ganó asiento 7 · 30 fichas');
  });

  it('omits the avatar when the player has none', () => {
    const text = describeHandResult({ winners: [2], payouts: { 2: 5 } }, [
      ...table,
      player(2, 'ana'),
    ]);
    assert.equal(text, 'Ganó ana · 5 fichas');
  });

  it('returns null when there are no winners to report', () => {
    assert.equal(describeHandResult({ winners: [], payouts: {} }, table), null);
  });

  it('groups thousands so large pots stay readable', () => {
    const text = describeHandResult({ winners: [1], payouts: { 1: 12500 } }, table);
    assert.equal(text, 'Ganó 🦊 maria · 12.500 fichas');
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
