import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Bet } from '../src/bets.js';
import { betFromSpot, betSpotId, payoutMultiplier } from '../src/bets.js';
import { betWins, resolveBet } from '../src/payout.js';
import { POCKETS, indexOfKey, pocketByIndex } from '../src/wheel.js';

const pocket = (key: string) => pocketByIndex(indexOfKey(key));

describe('bet spot ids', () => {
  it('round-trip through betFromSpot', () => {
    const bets: Bet[] = [
      { kind: 'straight', pocket: '00' },
      { kind: 'red' },
      { kind: 'dozen', value: 2 },
      { kind: 'column', value: 3 },
    ];
    for (const b of bets) {
      assert.deepEqual(betFromSpot(betSpotId(b)), b);
    }
    assert.equal(betFromSpot('nonsense'), null);
    assert.equal(betFromSpot('dozen:9'), null);
  });
});

describe('payouts (american)', () => {
  it('straight pays 35:1 only on an exact pocket', () => {
    assert.equal(payoutMultiplier('straight'), 35);
    assert.equal(resolveBet({ kind: 'straight', pocket: '17' }, 1000, pocket('17')), 36_000);
    assert.equal(resolveBet({ kind: 'straight', pocket: '17' }, 1000, pocket('18')), 0);
    assert.equal(resolveBet({ kind: 'straight', pocket: '00' }, 1000, pocket('00')), 36_000);
  });

  it('even-money outside bets pay 1:1', () => {
    assert.equal(resolveBet({ kind: 'red' }, 500, pocket('1')), 1000); // 1 is red
    assert.equal(resolveBet({ kind: 'black' }, 500, pocket('1')), 0);
    assert.equal(resolveBet({ kind: 'even' }, 500, pocket('2')), 1000);
    assert.equal(resolveBet({ kind: 'low' }, 500, pocket('18')), 1000);
    assert.equal(resolveBet({ kind: 'high' }, 500, pocket('18')), 0);
  });

  it('dozen and column pay 2:1', () => {
    assert.equal(resolveBet({ kind: 'dozen', value: 1 }, 100, pocket('12')), 300);
    assert.equal(resolveBet({ kind: 'column', value: 3 }, 100, pocket('3')), 300);
    assert.equal(resolveBet({ kind: 'column', value: 3 }, 100, pocket('2')), 0);
  });

  it('both zeroes lose every outside bet', () => {
    for (const zero of ['0', '00']) {
      const w = pocket(zero);
      for (const bet of [
        { kind: 'red' },
        { kind: 'black' },
        { kind: 'even' },
        { kind: 'odd' },
        { kind: 'low' },
        { kind: 'high' },
        { kind: 'dozen', value: 1 },
        { kind: 'column', value: 1 },
      ] as Bet[]) {
        assert.equal(betWins(bet, w), false, `${JSON.stringify(bet)} vs ${zero}`);
      }
    }
  });

  it('covers a full wheel with no crashes', () => {
    for (let i = 0; i < POCKETS.length; i++) {
      resolveBet({ kind: 'red' }, 1, pocketByIndex(i));
    }
  });
});
