/**
 * Pure Texas Hold'em No-Limit engine.
 * No network, no DB, no framework — only pure functions + injectable RNG.
 */

export const ENGINE_VERSION = '0.1.0';

export type EngineInfo = {
  name: 'poker-engine';
  version: string;
};

export function getEngineInfo(): EngineInfo {
  return { name: 'poker-engine', version: ENGINE_VERSION };
}

// RNG
export { createSeededRng, createCryptoRng } from './rng.js';
export type { Rng } from './rng.js';

// Cards / deck
export {
  createDeck,
  shuffle,
  deal,
  parseCard,
  parseCards,
} from './cards/deck.js';
export type { DealOptions, DealResult } from './cards/deck.js';
export { RANK_VALUE } from './cards/values.js';

// Evaluator
export {
  evaluateHand,
  scoreFive,
  compareHands,
  findWinners,
  HandCategory,
} from './evaluator/evaluate.js';
export type { EvaluatedHand, HandScore, HandCategoryId } from './evaluator/evaluate.js';

// Pots
export { buildSidePots, awardPots, oddChipOrder } from './pots/sidePots.js';
export type { Contribution, Pot } from './pots/sidePots.js';

// Hand state machine
export { startHand } from './state/startHand.js';
export { applyAction, totalChipsInHand } from './state/applyAction.js';
export type {
  HandPhase,
  PlayerStatus,
  PlayerInHand,
  ActionType,
  PlayerAction,
  HandConfig,
  HandState,
  DomainEvent,
  ApplyResult,
  EngineError,
} from './state/types.js';

// Probability (client-side Monte Carlo; pure, no network)
export {
  estimateEquity,
  exactRiverEquityVsOne,
  iterationsForStreet,
} from './probability/monteCarlo.js';
export type { EquityInput, EquityResult } from './probability/monteCarlo.js';

