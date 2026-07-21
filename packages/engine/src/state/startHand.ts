import { ok, err } from '@poker/shared';
import type { Card, Result } from '@poker/shared';
import { createDeck, shuffle } from '../cards/deck.js';
import type { Rng } from '../rng.js';
import type { ApplyResult, EngineError, HandConfig, HandState, PlayerInHand } from './types.js';
import {
  bigBlindSeat,
  cloneState,
  firstToActSeat,
  getPlayer,
  smallBlindSeat,
} from './helpers.js';
import { runOutIfNoAction } from './advance.js';

function postBlind(player: PlayerInHand, amount: number): number {
  const paid = Math.min(player.stack, amount);
  player.stack -= paid;
  player.betThisRound += paid;
  player.contribution += paid;
  if (player.stack === 0) {
    player.status = 'ALL_IN';
  }
  return paid;
}

/**
 * Start a new hand: shuffle, deal holes, post blinds, enter PREFLOP.
 * Community cards are dealt later street-by-street from remaining deck.
 */
export function startHand(
  config: HandConfig,
  rng: Rng,
): Result<ApplyResult, EngineError> {
  const seatEntries = Object.entries(config.stacks)
    .map(([s, stack]) => ({ seat: Number(s), stack }))
    .filter((x) => x.stack > 0)
    .sort((a, b) => a.seat - b.seat);

  if (seatEntries.length < 2) {
    return err({ code: 'NOT_ENOUGH_PLAYERS', message: 'Need at least 2 players with chips' });
  }
  if (!seatEntries.some((e) => e.seat === config.button)) {
    return err({ code: 'INVALID_BUTTON', message: 'Button seat is not among active players' });
  }
  if (config.smallBlind <= 0 || config.bigBlind <= 0 || config.bigBlind < config.smallBlind) {
    return err({ code: 'INVALID_BLINDS', message: 'Invalid blind structure' });
  }

  const burn = config.burn !== false;
  let deck = shuffle(createDeck(), rng);

  const players: PlayerInHand[] = seatEntries.map((e) => ({
    seat: e.seat,
    stack: e.stack,
    holeCards: [] as Card[],
    status: 'ACTIVE' as const,
    betThisRound: 0,
    contribution: 0,
  }));

  for (let r = 0; r < 2; r++) {
    for (const p of players) {
      const card = deck[0];
      if (!card) return err({ code: 'DECK_EMPTY', message: 'Deck exhausted while dealing' });
      deck = deck.slice(1);
      p.holeCards = [...p.holeCards, card];
    }
  }

  let state: HandState = {
    handId: config.handId,
    phase: 'PREFLOP',
    deck,
    community: [],
    burned: [],
    players,
    button: config.button,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    burn,
    currentBet: 0,
    minRaise: config.bigBlind,
    currentToAct: null,
    lastAggressorSeat: null,
    actedSinceAggression: [],
    pots: [],
    payouts: {},
    version: 1,
  };

  state = cloneState(state);
  const sbSeat = smallBlindSeat(state);
  const bbSeat = bigBlindSeat(state);
  const sbPlayer = getPlayer(state, sbSeat)!;
  const bbPlayer = getPlayer(state, bbSeat)!;
  const sbPaid = postBlind(sbPlayer, config.smallBlind);
  const bbPaid = postBlind(bbPlayer, config.bigBlind);

  state.currentBet = Math.max(sbPaid, bbPaid);
  state.minRaise = config.bigBlind;
  state.lastAggressorSeat = bbSeat;
  state.actedSinceAggression = [];
  state.currentToAct = firstToActSeat(state, 'PREFLOP');

  const events = [
    { type: 'hand:started' as const, handId: config.handId, button: config.button },
    {
      type: 'blinds:posted' as const,
      sbSeat,
      bbSeat,
      sb: sbPaid,
      bb: bbPaid,
    },
    { type: 'hand:dealt' as const, seats: players.map((p) => p.seat) },
    ...(state.currentToAct !== null
      ? [{ type: 'turn:begin' as const, seat: state.currentToAct }]
      : []),
  ];

  const actors = state.players.filter((p) => p.status === 'ACTIVE' && p.stack > 0);
  const needAction =
    actors.length >= 2 &&
    (actors.some((p) => p.betThisRound < state.currentBet) ||
      actors.some((p) => !state.actedSinceAggression.includes(p.seat)));

  if (!needAction) {
    const advanced = runOutIfNoAction(state);
    return ok({ state: advanced.state, events: [...events, ...advanced.events] });
  }

  return ok({ state, events });
}
