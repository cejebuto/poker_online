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
  status?: 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT';
  /** Bet this round (public). */
  betThisRound?: number;
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
