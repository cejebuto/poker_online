import { ok, err } from '@poker/shared';
import type { Result } from '@poker/shared';
import type {
  ApplyResult,
  EngineError,
  HandState,
  PlayerAction,
  PlayerInHand,
} from './types.js';
import {
  canAct,
  cloneState,
  getPlayer,
  isBettingPhase,
} from './helpers.js';
import {
  advanceAfterRound,
  isRoundComplete,
  nextActorAfter,
  onlyOneActive,
  resolveFoldOut,
} from './advance.js';

function putChips(player: PlayerInHand, amount: number): number {
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
 * Apply a player action. Pure and deterministic.
 * Fold is always available during betting rounds (until river inclusive).
 */
export function applyAction(
  state: HandState,
  action: PlayerAction,
): Result<ApplyResult, EngineError> {
  if (!isBettingPhase(state.phase)) {
    return err({ code: 'NOT_BETTING', message: `Cannot act during phase ${state.phase}` });
  }
  if (state.currentToAct !== action.seat) {
    return err({
      code: 'OUT_OF_TURN',
      message: `Seat ${action.seat} cannot act; current is ${state.currentToAct}`,
    });
  }

  const s = cloneState(state);
  const player = getPlayer(s, action.seat);
  if (!player) {
    return err({ code: 'UNKNOWN_SEAT', message: `Seat ${action.seat} not in hand` });
  }
  if (!canAct(player) && action.type !== 'fold') {
    // all-in players don't act; fold only if still active
    return err({ code: 'CANNOT_ACT', message: 'Player cannot act' });
  }
  if (player.status === 'FOLDED') {
    return err({ code: 'ALREADY_FOLDED', message: 'Player already folded' });
  }

  const toCall = s.currentBet - player.betThisRound;
  let paid = 0;
  let effectiveType = action.type;

  switch (action.type) {
    case 'fold': {
      player.status = 'FOLDED';
      break;
    }
    case 'check': {
      if (toCall > 0) {
        return err({ code: 'CANNOT_CHECK', message: `Must call ${toCall} or fold` });
      }
      break;
    }
    case 'call': {
      if (toCall <= 0) {
        // treat as check
        effectiveType = 'check';
        break;
      }
      paid = putChips(player, toCall);
      break;
    }
    case 'bet': {
      if (s.currentBet > 0) {
        return err({ code: 'CANNOT_BET', message: 'Bet not allowed; use raise' });
      }
      const amount = action.amount;
      if (amount === undefined || amount <= 0) {
        return err({ code: 'INVALID_AMOUNT', message: 'Bet requires positive amount' });
      }
      if (amount < s.bigBlind && amount < player.stack) {
        return err({
          code: 'BET_TOO_SMALL',
          message: `Minimum bet is ${s.bigBlind}`,
        });
      }
      if (amount > player.stack) {
        return err({ code: 'BET_TOO_LARGE', message: 'Amount exceeds stack' });
      }
      paid = putChips(player, amount);
      s.currentBet = player.betThisRound;
      s.minRaise = paid;
      s.lastAggressorSeat = player.seat;
      s.actedSinceAggression = [player.seat];
      break;
    }
    case 'raise': {
      if (s.currentBet <= 0) {
        return err({ code: 'CANNOT_RAISE', message: 'Nothing to raise; use bet' });
      }
      const amount = action.amount;
      if (amount === undefined || amount <= 0) {
        return err({ code: 'INVALID_AMOUNT', message: 'Raise requires total bet amount this round' });
      }
      // amount = total chips player wants to have in as betThisRound after raise
      const raiseTo = amount;
      if (raiseTo <= s.currentBet) {
        return err({
          code: 'RAISE_TOO_SMALL',
          message: `Raise must exceed current bet ${s.currentBet}`,
        });
      }
      const raiseSize = raiseTo - s.currentBet;
      const chipsNeeded = raiseTo - player.betThisRound;
      if (chipsNeeded > player.stack) {
        return err({ code: 'RAISE_TOO_LARGE', message: 'Amount exceeds stack' });
      }
      // Min raise: full minRaise unless all-in short
      if (raiseSize < s.minRaise && chipsNeeded < player.stack) {
        return err({
          code: 'RAISE_TOO_SMALL',
          message: `Minimum raise size is ${s.minRaise}`,
        });
      }
      paid = putChips(player, chipsNeeded);
      const actualRaise = player.betThisRound - s.currentBet;
      if (actualRaise >= s.minRaise) {
        s.minRaise = actualRaise;
      }
      s.currentBet = player.betThisRound;
      s.lastAggressorSeat = player.seat;
      s.actedSinceAggression = [player.seat];
      break;
    }
    case 'all-in': {
      const stack = player.stack;
      if (stack <= 0) {
        return err({ code: 'NO_CHIPS', message: 'No chips to go all-in' });
      }
      paid = putChips(player, stack);
      if (player.betThisRound > s.currentBet) {
        const raiseSize = player.betThisRound - s.currentBet;
        if (raiseSize >= s.minRaise) {
          s.minRaise = raiseSize;
          s.lastAggressorSeat = player.seat;
          s.actedSinceAggression = [player.seat];
        } else {
          // Short all-in raise does not reopen full action for min-raise purposes,
          // but still increases currentBet; others must call the new amount.
          // actedSinceAggression: reopen for players who need to call
          s.lastAggressorSeat = player.seat;
          s.actedSinceAggression = [player.seat];
        }
        s.currentBet = player.betThisRound;
      } else if (player.betThisRound === s.currentBet) {
        // all-in call
      }
      // if short call, just all-in for less; currentBet unchanged
      break;
    }
    default:
      return err({ code: 'UNKNOWN_ACTION', message: `Unknown action ${(action as PlayerAction).type}` });
  }

  // Mark voluntary action (except we already reset acted on bet/raise)
  if (action.type !== 'bet' && action.type !== 'raise' && action.type !== 'all-in') {
    if (!s.actedSinceAggression.includes(player.seat)) {
      s.actedSinceAggression = [...s.actedSinceAggression, player.seat];
    }
  } else if (action.type === 'all-in') {
    if (!s.actedSinceAggression.includes(player.seat)) {
      s.actedSinceAggression = [...s.actedSinceAggression, player.seat];
    }
  }

  // After fold, still mark acted
  if (action.type === 'fold' && !s.actedSinceAggression.includes(player.seat)) {
    s.actedSinceAggression = [...s.actedSinceAggression, player.seat];
  }

  s.version += 1;
  const events: ApplyResult['events'] = [
    {
      type: 'player:acted',
      seat: player.seat,
      action: effectiveType,
      amount: paid,
      stack: player.stack,
      contribution: player.contribution,
    },
  ];

  if (onlyOneActive(s)) {
    const resolved = resolveFoldOut(s);
    return ok({ state: resolved.state, events: [...events, ...resolved.events] });
  }

  if (isRoundComplete(s)) {
    const advanced = advanceAfterRound(s);
    return ok({ state: advanced.state, events: [...events, ...advanced.events] });
  }

  const next = nextActorAfter(s, player.seat);
  s.currentToAct = next;
  if (next !== null) {
    events.push({ type: 'turn:begin', seat: next });
  }
  return ok({ state: s, events });
}

/** Sum of stacks + contributions still in pot (conservation invariant). */
export function totalChipsInHand(state: HandState): number {
  return state.players.reduce((sum, p) => sum + p.stack + p.contribution, 0);
}
