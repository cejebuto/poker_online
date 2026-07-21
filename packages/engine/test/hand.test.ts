import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSeededRng } from '../src/rng.js';
import { startHand } from '../src/state/startHand.js';
import { applyAction, totalChipsInHand } from '../src/state/applyAction.js';
import type { HandState, PlayerAction } from '../src/state/types.js';

function mustStart(seed = 42) {
  const res = startHand(
    {
      handId: 'h1',
      stacks: { 0: 1000, 1: 1000, 2: 1000 },
      button: 0,
      smallBlind: 5,
      bigBlind: 10,
    },
    createSeededRng(seed),
  );
  assert.equal(res.ok, true);
  if (!res.ok) throw new Error(res.error.message);
  return res.value.state;
}

function act(state: HandState, action: PlayerAction): HandState {
  const res = applyAction(state, action);
  assert.equal(res.ok, true, res.ok ? '' : res.error.message);
  if (!res.ok) throw new Error(res.error.message);
  return res.value.state;
}

describe('hand state machine', () => {
  it('posts blinds and deals 2 cards', () => {
    const s = mustStart();
    assert.equal(s.phase, 'PREFLOP');
    // button 0 → SB=1, BB=2 (3-handed)
    const sb = s.players.find((p) => p.seat === 1)!;
    const bb = s.players.find((p) => p.seat === 2)!;
    assert.equal(sb.contribution, 5);
    assert.equal(bb.contribution, 10);
    for (const p of s.players) {
      assert.equal(p.holeCards.length, 2);
    }
    assert.equal(totalChipsInHand(s), 3000);
  });

  it('fold always available and ends hand when one remains', () => {
    let s = mustStart();
    // 3-handed: UTG is seat 0 (left of BB=2)
    assert.equal(s.currentToAct, 0);
    s = act(s, { seat: 0, type: 'fold' });
    s = act(s, { seat: 1, type: 'fold' });
    assert.equal(s.phase, 'COMPLETE');
    // BB wins blinds pot 15
    assert.equal(s.payouts[2], 15);
    assert.equal(totalChipsInHand(s), 3000);
  });

  it('check/call through preflop advances to flop', () => {
    let s = mustStart();
    // seat0 UTG call, seat1 SB call, seat2 BB check
    s = act(s, { seat: 0, type: 'call' });
    s = act(s, { seat: 1, type: 'call' });
    s = act(s, { seat: 2, type: 'check' });
    assert.equal(s.phase, 'FLOP');
    assert.equal(s.community.length, 3);
    assert.equal(totalChipsInHand(s), 3000);
  });

  it('is deterministic with same seed and actions', () => {
    const run = () => {
      let s = mustStart(99);
      s = act(s, { seat: 0, type: 'call' });
      s = act(s, { seat: 1, type: 'call' });
      s = act(s, { seat: 2, type: 'check' });
      return {
        community: s.community,
        holes: s.players.map((p) => p.holeCards),
        phase: s.phase,
      };
    };
    assert.deepEqual(run(), run());
  });

  it('rejects out-of-turn action', () => {
    const s = mustStart();
    const res = applyAction(s, { seat: 1, type: 'fold' });
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.error.code, 'OUT_OF_TURN');
  });

  it('heads-up: button is SB and acts first preflop', () => {
    const res = startHand(
      {
        handId: 'hu',
        stacks: { 0: 500, 1: 500 },
        button: 0,
        smallBlind: 5,
        bigBlind: 10,
      },
      createSeededRng(1),
    );
    assert.equal(res.ok, true);
    if (!res.ok) throw new Error('fail');
    const s = res.value.state;
    assert.equal(s.currentToAct, 0);
    const btn = s.players.find((p) => p.seat === 0)!;
    assert.equal(btn.contribution, 5);
  });

  it('full hand to complete conserves chips', () => {
    let s = mustStart(7);
    const initial = totalChipsInHand(s);
    // limp to flop
    s = act(s, { seat: 0, type: 'call' });
    s = act(s, { seat: 1, type: 'call' });
    s = act(s, { seat: 2, type: 'check' });
    // check down
    while (s.phase !== 'COMPLETE' && s.currentToAct !== null) {
      const p = s.players.find((x) => x.seat === s.currentToAct)!;
      const toCall = s.currentBet - p.betThisRound;
      if (toCall > 0) {
        s = act(s, { seat: s.currentToAct, type: 'call' });
      } else {
        s = act(s, { seat: s.currentToAct, type: 'check' });
      }
    }
    assert.equal(s.phase, 'COMPLETE');
    assert.equal(totalChipsInHand(s), initial);
    assert.equal(s.community.length, 5);
  });

  it('bet and raise validation', () => {
    let s = mustStart();
    s = act(s, { seat: 0, type: 'call' });
    s = act(s, { seat: 1, type: 'call' });
    s = act(s, { seat: 2, type: 'check' });
    // flop: first to act is left of button 0 → seat 1
    assert.equal(s.currentToAct, 1);
    s = act(s, { seat: 1, type: 'bet', amount: 20 });
    const tooSmall = applyAction(s, { seat: 2, type: 'raise', amount: 25 });
    assert.equal(tooSmall.ok, false);
    s = act(s, { seat: 2, type: 'raise', amount: 50 }); // raise to 50
    s = act(s, { seat: 0, type: 'fold' });
    s = act(s, { seat: 1, type: 'call' });
    assert.ok(s.phase === 'TURN' || s.phase === 'COMPLETE' || s.phase === 'RIVER');
    assert.equal(totalChipsInHand(s), 3000);
  });
});
