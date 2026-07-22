import type { Card } from './cards.js';

export type PlayerRole = 'host' | 'player' | 'mesa';

export type RoomPhase = 'LOBBY' | 'IN_HAND' | 'PAUSED' | 'CLOSED' | 'FINISHED';

/** One row of the public table directory. Never carries secrets or player data. */
export type RoomSummary = {
  roomId: string;
  code: string;
  name: string;
  players: number;
  maxPlayers: number;
  phase: RoomPhase;
  hasPassword: boolean;
};

/** One tournament blind level. */
export type BlindLevel = {
  smallBlind: number;
  bigBlind: number;
  /** Duration of this level in ms (time-based). */
  durationMs: number;
};

export type RoomConfig = {
  name: string;
  maxPlayers: number;
  startingStack: number;
  mode: 'cash' | 'tournament';
  /** Initial / cash blinds (tournament overrides via structure). */
  smallBlind: number;
  bigBlind: number;
  /**
   * Turn timer in ms. 0 = no limit.
   * Also accept turnTimerSec in UI — converted to ms on create.
   */
  turnTimeoutMs?: number;
  timeBankMs?: number;
  reconnectWindowMs?: number;
  /** Cash: allow rebuy between hands. Tournament: typically false. */
  allowRebuy?: boolean;
  /** Max number of rebuys per player (cash). */
  rebuyMax?: number;
  /**
   * When true, the minimum open-bet is 2× bigBlind (and min-raise floor doubles).
   * Spec §19: quick-bet / min-raise convenience for the table.
   */
  doubleMinimum?: boolean;
  /** Tournament only: blind ladder. Default structure applied if empty. */
  blindStructure?: BlindLevel[];
};

export type UserInfo = {
  displayName: string;
  avatar?: string;
};

export type PublicPlayer = {
  playerId: string;
  displayName: string;
  avatar?: string;
  role: PlayerRole;
  seat: number | null;
  stack: number;
  connected: boolean;
  status?: 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT' | 'DISCONNECTED' | 'ELIMINATED';
  betThisRound?: number;
  /** Every chip this player put into the current hand, across all streets. */
  committedThisHand?: number;
  timeBankMs?: number;
  rebuyCount?: number;
  /** Accepted the next hand. */
  ready?: boolean;
  /** Tournament finish place (1 = winner). */
  finishPlace?: number;
};

export type PublicPot = {
  amount: number;
  eligibleSeats: number[];
};

export type PublicHandState = {
  handId: string;
  phase: string;
  community: Card[];
  pots: PublicPot[];
  currentToAct: number | null;
  currentBet: number;
  minRaise: number;
  button: number;
  /**
   * Every chip committed to this hand so far. `pots` only materializes when the
   * hand resolves, so this is the number to show while betting is live.
   */
  potTotal: number;
  yourCards?: Card[];
  turnStartedAt?: number;
  turnTimeoutMs?: number;
  actorTimeBankMs?: number;
};

export type PublicTournamentState = {
  levelIndex: number;
  smallBlind: number;
  bigBlind: number;
  levelEndsAt: number | null;
  nextSmallBlind: number | null;
  nextBigBlind: number | null;
  playersRemaining: number;
  finished: boolean;
  ranking: { playerId: string; displayName: string; place: number }[];
};

/** Client-safe room state — no password, no deck, no foreign hole cards. */
export type PublicRoomState = {
  roomId: string;
  code: string;
  phase: RoomPhase;
  config: RoomConfig;
  hostPlayerId: string;
  players: PublicPlayer[];
  version: number;
  joinUrl: string;
  hand?: PublicHandState;
  lastResult?: {
    payouts: Record<number, number>;
    winners: number[];
    /**
     * Hole cards of everyone who reached the end of the hand. Only present once
     * the hand is COMPLETE. The key is `cards`, never `holeCards` — the privacy
     * scanner treats that name as a leak by definition.
     */
    showdown?: { seat: number; cards: Card[] }[];
  };
  /** Progress toward the next hand, between hands. */
  nextHand?: {
    ready: number;
    needed: number;
  };
  tournament?: PublicTournamentState;
  /** Effective blinds after structure / doubleMinimum. */
  effectiveSmallBlind: number;
  effectiveBigBlind: number;
};
