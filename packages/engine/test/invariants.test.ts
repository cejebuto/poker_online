import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSeededRng } from '../src/rng.js';
import { startHand } from '../src/state/startHand.js';
import { applyAction, totalChipsInHand } from '../src/state/applyAction.js';
import type { HandState } from '../src/state/types.js';

function playRandomHand(seed: number): { initial: number; final: number; phase: string } {
  const rng = createSeededRng(seed);
  const stacks: Record<number, number> = { 0: 200, 1: 200, 2: 200, 3: 200 };
  const start = startHand(
    {
      handId: `h-${seed}`,
      stacks,
      button: seed % 4,
      smallBlind: 1,
      bigBlind: 2,
    },
    rng,
  );
  if (!start.ok) throw new Error(start.error.message);
  let s: HandState = start.value.state;
  const initial = totalChipsInHand(s);
  let guard = 0;
  while (s.phase !== 'COMPLETE' && guard++ < 200) {
    if (s.currentToAct === null) break;
    const seat = s.currentToAct;
    const p = s.players.find((x) => x.seat === seat)!;
    const toCall = s.currentBet - p.betThisRound;
    const roll = rng();
    let next = applyAction(s, { seat, type: 'fold' });
    if (roll < 0.15) {
      next = applyAction(s, { seat, type: 'fold' });
    } else if (toCall > 0) {
      if (roll < 0.7) next = applyAction(s, { seat, type: 'call' });
      else if (roll < 0.9 && p.stack > toCall) {
        const raiseTo = s.currentBet + Math.max(s.minRaise, 2);
        next = applyAction(s, { seat, type: 'raise', amount: Math.min(raiseTo, p.betThisRound + p.stack) });
        if (!next.ok) next = applyAction(s, { seat, type: 'call' });
      } else {
        next = applyAction(s, { seat, type: 'all-in' });
      }
    } else {
      if (roll < 0.5) next = applyAction(s, { seat, type: 'check' });
      else if (roll < 0.85) {
        next = applyAction(s, { seat, type: 'bet', amount: Math.min(10, p.stack) });
        if (!next.ok) next = applyAction(s, { seat, type: 'check' });
      } else {
        next = applyAction(s, { seat, type: 'all-in' });
      }
    }
    if (!next.ok) {
      // force fold if illegal
      next = applyAction(s, { seat, type: 'fold' });
      if (!next.ok) break;
    }
    s = next.value.state;
  }
  return { initial, final: totalChipsInHand(s), phase: s.phase };
}

describe('invariants (property-style)', () => {
  it('conserves chips across many random hands', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { initial, final, phase } = playRandomHand(seed);
      assert.equal(final, initial, `seed ${seed}: chips ${final} !== ${initial} phase=${phase}`);
      assert.equal(phase, 'COMPLETE', `seed ${seed} not complete`);
    }
  });

  it('pots never negative after showdown', () => {
    for (let seed = 100; seed < 120; seed++) {
      const rng = createSeededRng(seed);
      const start = startHand(
        {
          handId: 'x',
          stacks: { 0: 50, 1: 100, 2: 150 },
          button: 0,
          smallBlind: 5,
          bigBlind: 10,
        },
        rng,
      );
      assert.equal(start.ok, true);
      if (!start.ok) continue;
      let s = start.value.state;
      let g = 0;
      while (s.phase !== 'COMPLETE' && g++ < 100 && s.currentToAct !== null) {
        const seat = s.currentToAct;
        const p = s.players.find((x) => x.seat === seat)!;
        const toCall = s.currentBet - p.betThisRound;
        const res =
          toCall > 0
            ? applyAction(s, { seat, type: 'call' })
            : applyAction(s, { seat, type: 'check' });
        if (!res.ok) break;
        s = res.value.state;
      }
      for (const pot of s.pots) {
        assert.ok(pot.amount >= 0);
      }
      assert.equal(totalChipsInHand(s), 300);
    }
  });
});
