import type { Card, GameError } from '@poker/shared';
import type { Pot } from '../pots/sidePots.js';
import type { HandScore } from '../evaluator/evaluate.js';

export type HandPhase =
  | 'DEALING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'PAYOUT'
  | 'COMPLETE';

export type PlayerStatus = 'ACTIVE' | 'FOLDED' | 'ALL_IN';

export type PlayerInHand = {
  seat: number;
  stack: number;
  holeCards: Card[];
  status: PlayerStatus;
  /** Chips committed this betting round. */
  betThisRound: number;
  /** Total chips committed this hand (for side pots). */
  contribution: number;
};

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export type PlayerAction = {
  seat: number;
  type: ActionType;
  /** Required for bet/raise; optional for all-in (uses full stack if omitted). */
  amount?: number;
};

export type HandConfig = {
  handId: string;
  /** Seat → starting stack for this hand. Only seats with stack > 0 play. */
  stacks: Readonly<Record<number, number>>;
  button: number;
  smallBlind: number;
  bigBlind: number;
  /** Burn cards before each street (default true). */
  burn?: boolean;
};

export type HandState = {
  handId: string;
  phase: HandPhase;
  /** Remaining undealt cards (top of deck is index 0). */
  deck: Card[];
  community: Card[];
  burned: Card[];
  players: PlayerInHand[];
  button: number;
  smallBlind: number;
  bigBlind: number;
  burn: boolean;
  /** Highest total betThisRound among players this street. */
  currentBet: number;
  /** Minimum raise size (last full raise increment). */
  minRaise: number;
  /** Seat that must act, or null if no action pending. */
  currentToAct: number | null;
  lastAggressorSeat: number | null;
  /** Players who have acted since last aggression (for round completion). */
  actedSinceAggression: number[];
  pots: Pot[];
  /** Seat → chips won at payout. */
  payouts: Record<number, number>;
  showdownResults?: Record<number, { score: HandScore; category: number }>;
  version: number;
};

export type DomainEvent =
  | { type: 'hand:started'; handId: string; button: number }
  | { type: 'blinds:posted'; sbSeat: number; bbSeat: number; sb: number; bb: number }
  | { type: 'hand:dealt'; seats: number[] }
  | { type: 'street:dealt'; phase: HandPhase; community: Card[] }
  | { type: 'turn:begin'; seat: number }
  | {
      type: 'player:acted';
      seat: number;
      action: ActionType;
      amount: number;
      stack: number;
      contribution: number;
    }
  | { type: 'street:ended'; phase: HandPhase }
  | { type: 'hand:folded_out'; winnerSeat: number }
  | { type: 'showdown:resolved'; winnersByPot: { potIndex: number; seats: number[] }[] }
  | { type: 'hand:payout'; payouts: Record<number, number> }
  | { type: 'hand:complete'; handId: string };

export type ApplyResult = {
  state: HandState;
  events: DomainEvent[];
};

export type EngineError = GameError;
