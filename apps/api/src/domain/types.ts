import type { HandState } from '@poker/engine';
import type { PlayerRole, RoomConfig, RoomPhase } from '@poker/shared';

export type InternalPlayer = {
  playerId: string;
  displayName: string;
  avatar?: string;
  role: PlayerRole;
  seat: number | null;
  stack: number;
  connected: boolean;
  /** Set of connection ids currently attached. */
  connectionIds: Set<string>;
};

export type InternalRoom = {
  roomId: string;
  code: string;
  /** bcrypt hash — never send to clients */
  passwordHash: string;
  hostPlayerId: string;
  phase: RoomPhase;
  config: RoomConfig;
  players: Map<string, InternalPlayer>;
  version: number;
  /** Private engine hand state (includes deck + all holes). */
  hand?: HandState;
  processedActionIds: Set<string>;
  emptySince: number | null;
  createdAt: number;
};

export const DEFAULT_CONFIG: RoomConfig = {
  name: 'Poker Night',
  maxPlayers: 8,
  smallBlind: 5,
  bigBlind: 10,
  startingStack: 1000,
  mode: 'cash',
};

export const ROOM_DESTROY_GRACE_MS = 15_000;
