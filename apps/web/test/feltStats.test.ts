import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicPlayer } from '@poker/shared';
import {
  canAffordTotal,
  minAggressiveAction,
  passiveAction,
  tripleTargetAmount,
} from '../src/features/feltActions.js';
import {
  actionLabel,
  collectedPot,
  describeAction,
  formatChips,
  handCounts,
  potOdds,
  streetLabel,
} from '../src/features/feltStats.js';

function player(seat: number, status?: PublicPlayer['status']): PublicPlayer {
  return {
    playerId: `p${seat}`,
    displayName: `Usuario ${seat}`,
    role: 'player',
    seat,
    stack: 1000,
    connected: true,
    ...(status ? { status } : {}),
  };
}

describe('formatChips', () => {
  it('groups thousands and prefixes the currency mark', () => {
    assert.equal(formatChips(3250), '$3.250');
    assert.equal(formatChips(120), '$120');
  });

  it('renders zero rather than an empty string', () => {
    assert.equal(formatChips(0), '$0');
  });
});

describe('potOdds', () => {
  it('expresses the pot as a ratio of the call', () => {
    assert.equal(potOdds(360, 120), '3.0:1');
    assert.equal(potOdds(3250, 120), '27.1:1');
  });

  it('has no meaning when there is nothing to call', () => {
    assert.equal(potOdds(500, 0), null);
  });

  it('handles a call larger than the pot', () => {
    assert.equal(potOdds(100, 200), '0.5:1');
  });
});

describe('handCounts', () => {
  it('counts players still contesting against those seated', () => {
    const players = [
      player(0, 'ACTIVE'),
      player(1, 'FOLDED'),
      player(2, 'FOLDED'),
      player(3, 'ALL_IN'),
      player(4, 'ACTIVE'),
    ];
    assert.deepEqual(handCounts(players), { inHand: 3, seated: 5 });
  });

  it('excludes the mesa device from both counts', () => {
    const players = [player(0, 'ACTIVE'), { ...player(1), role: 'mesa' as const, seat: null }];
    assert.deepEqual(handCounts(players), { inHand: 1, seated: 1 });
  });

  it('does not count eliminated or sitting-out players as seated', () => {
    const players = [player(0, 'ACTIVE'), player(1, 'ELIMINATED'), player(2, 'SITTING_OUT')];
    assert.deepEqual(handCounts(players), { inHand: 1, seated: 1 });
  });

  it('treats a player with no status as still in the hand', () => {
    assert.deepEqual(handCounts([player(0)]), { inHand: 1, seated: 1 });
  });
});

describe('describeAction', () => {
  it('names the action with its amount', () => {
    assert.equal(describeAction('bet', 120), 'Bet $120');
    assert.equal(describeAction('raise', 400), 'Raise $400');
    assert.equal(describeAction('call', 120), 'Call $120');
  });

  it('omits the amount for actions that carry none', () => {
    assert.equal(describeAction('fold', 0), 'Fold');
    assert.equal(describeAction('check', 0), 'Check');
  });

  it('labels an all-in with the committed amount', () => {
    assert.equal(describeAction('all-in', 980), 'All-in $980');
  });
});

describe('streetLabel', () => {
  it('uses the poker street names', () => {
    assert.equal(streetLabel('RIVER'), 'RIVER');
    assert.equal(streetLabel('PREFLOP'), 'PREFLOP');
  });

  it('falls back to a dash when no hand is running', () => {
    assert.equal(streetLabel(undefined), '—');
  });
});

describe('feltActions (Vista Mesa)', () => {
  it('opens with a BB-sized bet when nothing is open', () => {
    assert.deepEqual(
      minAggressiveAction({ currentBet: 0, minRaise: 10, bigBlind: 10 }),
      { kind: 'bet', amount: 10 },
    );
  });

  it('min raise is raise-to (current + minRaise), not the size alone', () => {
    assert.deepEqual(
      minAggressiveAction({ currentBet: 50, minRaise: 50, bigBlind: 10 }),
      { kind: 'raise', amount: 100 },
    );
  });

  it('x3 is 3× BB with no bet, else 3× current bet as raise-to', () => {
    assert.deepEqual(tripleTargetAmount({ currentBet: 0, bigBlind: 10 }), {
      kind: 'bet',
      amount: 30,
    });
    assert.deepEqual(tripleTargetAmount({ currentBet: 50, bigBlind: 10 }), {
      kind: 'raise',
      amount: 150,
    });
  });

  it('passive slot is check or fold from toCall', () => {
    assert.equal(passiveAction(0), 'check');
    assert.equal(passiveAction(25), 'fold');
  });

  it('canAffordTotal accounts for chips already in this round', () => {
    assert.equal(canAffordTotal(100, 20, 100), true); // needs 80
    assert.equal(canAffordTotal(50, 20, 100), false); // needs 80
    assert.equal(canAffordTotal(30, 0, 30), true);
  });
});

describe('actionLabel', () => {
  it('is just the verb, no amount', () => {
    assert.equal(actionLabel('raise'), 'Raise');
    assert.equal(actionLabel('all-in'), 'All-in');
    assert.equal(actionLabel('check'), 'Check');
  });
});

describe('collectedPot', () => {
  it('subtracts this round bets from the total (chips ride beside the seats)', () => {
    const players = [
      player(0),
      { ...player(1), betThisRound: 30 },
      { ...player(2), betThisRound: 30 },
    ];
    // 100 committed, 60 still out this round -> 40 already in the center.
    assert.equal(collectedPot(100, players), 40);
  });

  it('equals the total once bets have swept in (no live bets)', () => {
    assert.equal(collectedPot(100, [player(0), player(1)]), 100);
  });

  it('never goes negative', () => {
    assert.equal(collectedPot(20, [{ ...player(0), betThisRound: 50 }]), 0);
  });
});
