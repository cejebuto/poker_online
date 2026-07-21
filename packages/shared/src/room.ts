import type { Card } from './cards.js';

export type PlayerRole = 'host' | 'player' | 'mesa';

export type RoomPhase = 'LOBBY' | 'IN_HAND' | 'PAUSED' | 'CLOSED';

export type RoomConfig = {
  name: string;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** cash | tournament — full behavior in later phase */
  mode: 'cash' | 'tournament';
  /**
   * Turn timer in ms. 0 / undefined = no limit.
   * Default applied by server if omitted.
   */
  turnTimeoutMs?: number;
  /** Extra seconds bank per player (ms). */
  timeBankMs?: number;
  /** How long a disconnected player keeps seat before sitting out (ms). */
  reconnectWindowMs?: number;
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
  status?: 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT' | 'DISCONNECTED';
  /** Bet this round (public). */
  betThisRound?: number;
  /** Remaining time bank (ms). */
  timeBankMs?: number;
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
  /** Never includes other players' hole cards. */
  yourCards?: Card[];
  /** Wall-clock when current turn started (ms epoch). */
  turnStartedAt?: number;
  /** Configured turn timeout (ms); 0 = unlimited. */
  turnTimeoutMs?: number;
  /** Time bank remaining for current actor (ms). */
  actorTimeBankMs?: number;
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
  };
};
