import type { Card } from '@poker/shared';
import { buildSidePots, awardPots, oddChipOrder } from '../pots/sidePots.js';
import { evaluateHand, compareHands } from '../evaluator/evaluate.js';
import type { ApplyResult, DomainEvent, HandPhase, HandState } from './types.js';
import {
  activePlayers,
  canAct,
  cloneState,
  firstToActSeat,
  getPlayer,
  nextSeat,
  nextStreet,
} from './helpers.js';

function takeTop(state: HandState): { card: Card; state: HandState } {
  const card = state.deck[0];
  if (!card) throw new Error('Deck exhausted');
  return {
    card,
    state: { ...state, deck: state.deck.slice(1) },
  };
}

function dealStreetCards(state: HandState, phase: HandPhase): { state: HandState; events: DomainEvent[] } {
  let s = cloneState(state);
  const events: DomainEvent[] = [];

  if (s.burn) {
    const burned = takeTop(s);
    s = burned.state;
    s.burned = [...s.burned, burned.card];
  }

  if (phase === 'FLOP') {
    const c1 = takeTop(s);
    s = c1.state;
    const c2 = takeTop(s);
    s = c2.state;
    const c3 = takeTop(s);
    s = c3.state;
    s.community = [...s.community, c1.card, c2.card, c3.card];
  } else {
    const c = takeTop(s);
    s = c.state;
    s.community = [...s.community, c.card];
  }

  s.phase = phase;
  s.version += 1;
  events.push({ type: 'street:dealt', phase, community: s.community.map((c) => ({ ...c })) });
  return { state: s, events };
}

function resetRoundBets(state: HandState): HandState {
  const s = cloneState(state);
  for (const p of s.players) {
    p.betThisRound = 0;
  }
  s.currentBet = 0;
  s.minRaise = s.bigBlind;
  s.lastAggressorSeat = null;
  s.actedSinceAggression = [];
  return s;
}

export function isRoundComplete(state: HandState): boolean {
  const contenders = activePlayers(state);
  if (contenders.length <= 1) return true;

  const toAct = contenders.filter((p) => p.status === 'ACTIVE' && p.stack > 0);
  if (toAct.length === 0) return true; // all remaining are all-in

  // Everyone who can act must have matched currentBet and acted since last aggression
  for (const p of toAct) {
    if (p.betThisRound < state.currentBet) return false;
    if (!state.actedSinceAggression.includes(p.seat)) {
      // Exception: if currentBet is 0 and no aggression, everyone must still check through
      // first-to-act cycle: require all able players in actedSinceAggression
      return false;
    }
  }
  return true;
}

export function onlyOneActive(state: HandState): boolean {
  return activePlayers(state).length === 1;
}

export function resolveFoldOut(state: HandState): ApplyResult {
  const s = cloneState(state);
  const winner = activePlayers(s)[0]!;
  const total = s.players.reduce((sum, p) => sum + p.contribution, 0);
  s.phase = 'PAYOUT';
  s.currentToAct = null;
  s.pots = [
    {
      amount: total,
      eligibleSeats: [winner.seat],
    },
  ];
  s.payouts = { [winner.seat]: total };
  // Return chips to winner stack
  const wp = getPlayer(s, winner.seat)!;
  wp.stack += total;
  // Clear contributions (chips left the hand)
  for (const p of s.players) {
    p.contribution = 0;
    p.betThisRound = 0;
  }
  s.phase = 'COMPLETE';
  s.version += 1;
  return {
    state: s,
    events: [
      { type: 'hand:folded_out', winnerSeat: winner.seat },
      { type: 'hand:payout', payouts: { ...s.payouts } },
      { type: 'hand:complete', handId: s.handId },
    ],
  };
}

export function resolveShowdown(state: HandState): ApplyResult {
  const s = cloneState(state);
  const events: DomainEvent[] = [];
  s.phase = 'SHOWDOWN';

  const contributions = s.players.map((p) => ({
    seat: p.seat,
    amount: p.contribution,
    eligible: p.status !== 'FOLDED',
  }));
  s.pots = buildSidePots(contributions);

  const showdownPlayers = s.players.filter((p) => p.status !== 'FOLDED');
  const scoreBySeat = new Map<number, ReturnType<typeof evaluateHand>>();
  for (const p of showdownPlayers) {
    scoreBySeat.set(p.seat, evaluateHand([...p.holeCards, ...s.community]));
  }
  s.showdownResults = Object.fromEntries(
    [...scoreBySeat.entries()].map(([seat, ev]) => [
      seat,
      { score: [...ev.score], category: ev.category },
    ]),
  );

  const allSeats = s.players.map((p) => p.seat);
  const priority = oddChipOrder(allSeats, s.button);

  const winnersByPot: { potIndex: number; seats: number[] }[] = [];
  const payouts = awardPots(
    s.pots,
    (eligible) => {
      let best: ReturnType<typeof evaluateHand>['score'] | null = null;
      const winners: number[] = [];
      for (const seat of eligible) {
        const ev = scoreBySeat.get(seat);
        if (!ev) continue;
        if (!best || compareHands(ev.score, best) > 0) {
          best = ev.score;
          winners.length = 0;
          winners.push(seat);
        } else if (compareHands(ev.score, best) === 0) {
          winners.push(seat);
        }
      }
      return winners;
    },
    priority,
  );

  s.pots.forEach((pot, i) => {
    let best: ReturnType<typeof evaluateHand>['score'] | null = null;
    const w: number[] = [];
    for (const seat of pot.eligibleSeats) {
      const ev = scoreBySeat.get(seat);
      if (!ev) continue;
      if (!best || compareHands(ev.score, best) > 0) {
        best = ev.score;
        w.length = 0;
        w.push(seat);
      } else if (compareHands(ev.score, best) === 0) {
        w.push(seat);
      }
    }
    winnersByPot.push({ potIndex: i, seats: w });
  });

  events.push({ type: 'showdown:resolved', winnersByPot });

  s.payouts = Object.fromEntries(payouts);
  for (const [seat, amount] of payouts) {
    const p = getPlayer(s, seat);
    if (p) p.stack += amount;
  }
  for (const p of s.players) {
    p.contribution = 0;
    p.betThisRound = 0;
  }

  s.phase = 'COMPLETE';
  s.currentToAct = null;
  s.version += 1;
  events.push({ type: 'hand:payout', payouts: { ...s.payouts } });
  events.push({ type: 'hand:complete', handId: s.handId });
  return { state: s, events };
}

/**
 * After a street ends (or no one can act), advance to next street or showdown.
 * May deal multiple streets if everyone is all-in.
 */
export function advanceAfterRound(state: HandState): ApplyResult {
  let s = cloneState(state);
  const events: DomainEvent[] = [];

  if (onlyOneActive(s)) {
    return resolveFoldOut(s);
  }

  events.push({ type: 'street:ended', phase: s.phase });

  // Keep dealing until someone can act or we hit showdown
  for (let guard = 0; guard < 8; guard++) {
    const next = nextStreet(s.phase);
    if (!next || next === 'SHOWDOWN') {
      // Ensure full board for showdown
      while (s.community.length < 5) {
        const phaseForDeal: HandPhase =
          s.community.length === 0 ? 'FLOP' : s.community.length === 3 ? 'TURN' : 'RIVER';
        const dealt = dealStreetCards(s, phaseForDeal);
        s = dealt.state;
        events.push(...dealt.events);
      }
      const showdown = resolveShowdown(s);
      return { state: showdown.state, events: [...events, ...showdown.events] };
    }

    const dealt = dealStreetCards(s, next);
    s = dealt.state;
    events.push(...dealt.events);
    s = resetRoundBets(s);

    const actors = s.players.filter((p) => canAct(p));
    if (actors.length >= 2) {
      s.currentToAct = firstToActSeat(s, s.phase);
      if (s.currentToAct !== null) {
        events.push({ type: 'turn:begin', seat: s.currentToAct });
      }
      s.version += 1;
      return { state: s, events };
    }
    // Fewer than 2 can act → continue to next street / showdown
  }
  // Safety fallback
  const showdown = resolveShowdown(s);
  return { state: showdown.state, events: [...events, ...showdown.events] };
}

/** If no voluntary action is possible (all-in blinds etc.), run out the board. */
export function runOutIfNoAction(state: HandState): ApplyResult {
  const s = cloneState(state);
  const actors = s.players.filter((p) => canAct(p));
  const needMatch = actors.some((p) => p.betThisRound < s.currentBet);
  if (actors.length >= 2 && (needMatch || s.actedSinceAggression.length < actors.length)) {
    // Still need action
    return { state: s, events: [] };
  }
  // If only one active or all all-in matched
  if (onlyOneActive(s)) {
    return resolveFoldOut(s);
  }
  return advanceAfterRound(s);
}

export function nextActorAfter(state: HandState, seat: number): number | null {
  return nextSeat(state, seat, (p) => canAct(p));
}
