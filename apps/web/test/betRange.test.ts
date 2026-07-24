import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  amountFromSliderY,
  betSliderRange,
  potSizedTotal,
  sliderFillRatio,
  snapBetAmount,
} from '../src/features/betRange.js';
import { clampBetAmount } from '../src/chips/denominations.js';

describe('betSliderRange', () => {
  it('opens at the big blind when nobody has bet', () => {
    const range = betSliderRange({
      currentBet: 0,
      minRaise: 100,
      bigBlind: 100,
      myBetThisRound: 0,
      stack: 2000,
    });
    assert.equal(range.kind, 'bet');
    assert.equal(range.min, 100);
    assert.equal(range.max, 2000);
    assert.equal(range.allInOnly, false);
  });

  it('starts a raise at currentBet + minRaise', () => {
    const range = betSliderRange({
      currentBet: 300,
      minRaise: 200,
      bigBlind: 100,
      myBetThisRound: 100,
      stack: 2000,
    });
    assert.equal(range.kind, 'raise');
    assert.equal(range.min, 500);
    assert.equal(range.max, 2100, 'already-committed chips count toward the round total');
  });

  it('caps the minimum at the all-in total instead of proposing an illegal raise', () => {
    const range = betSliderRange({
      currentBet: 300,
      minRaise: 200,
      bigBlind: 100,
      myBetThisRound: 0,
      stack: 400,
    });
    assert.equal(range.max, 400);
    assert.equal(range.min, 400);
    assert.equal(range.allInOnly, true, 'a short stack can only shove');
  });

  it('is all-in only when the stack cannot even open for a big blind', () => {
    const range = betSliderRange({
      currentBet: 0,
      minRaise: 100,
      bigBlind: 100,
      myBetThisRound: 0,
      stack: 60,
    });
    assert.equal(range.min, 60);
    assert.equal(range.max, 60);
    assert.equal(range.allInOnly, true);
  });

  it('produces amounts the shared clamp accepts unchanged', () => {
    const input = {
      currentBet: 300,
      minRaise: 200,
      bigBlind: 100,
      myBetThisRound: 100,
      stack: 2000,
    };
    const range = betSliderRange(input);
    for (const amount of [range.min, 900, 1500, range.max]) {
      assert.equal(
        clampBetAmount({ ...input, amount, toCall: input.currentBet - input.myBetThisRound }),
        amount,
        `clamp moved ${amount}`,
      );
    }
  });
});

describe('snapBetAmount', () => {
  it('floors to 0.1K steps', () => {
    assert.equal(snapBetAmount(2148, 100, 10_000), 2100);
    assert.equal(snapBetAmount(2199, 100, 10_000), 2100);
    assert.equal(snapBetAmount(2200, 100, 10_000), 2200);
  });

  it('keeps min and all-in (max) reachable', () => {
    assert.equal(snapBetAmount(50, 100, 987), 100);
    assert.equal(snapBetAmount(987, 100, 987), 987);
    assert.equal(snapBetAmount(9999, 100, 987), 987);
  });
});

describe('amountFromSliderY', () => {
  const track = { trackTop: 100, trackHeight: 200, min: 100, max: 1100 };

  it('maps the top of the track to all-in (max)', () => {
    assert.equal(amountFromSliderY({ ...track, clientY: 100 }), 1100);
  });

  it('maps the bottom of the track to min', () => {
    assert.equal(amountFromSliderY({ ...track, clientY: 300 }), 100);
  });

  it('maps the middle to a 0.1K-snapped mid amount', () => {
    assert.equal(amountFromSliderY({ ...track, clientY: 200 }), 600);
  });
});

describe('sliderFillRatio', () => {
  it('is 0 at min and 1 at max', () => {
    assert.equal(sliderFillRatio(100, 100, 1100), 0);
    assert.equal(sliderFillRatio(1100, 100, 1100), 1);
  });

  it('is 1 when only all-in is legal', () => {
    assert.equal(sliderFillRatio(400, 400, 400), 1);
  });
});

describe('potSizedTotal', () => {
  it('bets the pot when the action is open', () => {
    assert.equal(potSizedTotal({ pot: 600, toCall: 0, myBetThisRound: 0, fraction: 1 }), 600);
  });

  it('half pot is half of what is out there', () => {
    assert.equal(potSizedTotal({ pot: 600, toCall: 0, myBetThisRound: 0, fraction: 0.5 }), 300);
  });

  it('facing a bet, a pot raise is call + the pot after calling', () => {
    // Pot 600 includes the 200 bet we face: calling makes it 800, raising the pot
    // puts us at 200 (call) + 800 = 1000 total for the round.
    assert.equal(potSizedTotal({ pot: 600, toCall: 200, myBetThisRound: 0, fraction: 1 }), 1000);
  });

  it('counts chips already in front of us toward the round total', () => {
    assert.equal(potSizedTotal({ pot: 600, toCall: 200, myBetThisRound: 100, fraction: 1 }), 1100);
  });

  it('never goes below zero', () => {
    assert.equal(potSizedTotal({ pot: 0, toCall: 0, myBetThisRound: 0, fraction: 0.5 }), 0);
  });
});
