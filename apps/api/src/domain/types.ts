import type { HandState } from '@poker/engine';
import type { PlayerRole, RoomConfig, RoomPhase } from '@poker/shared';

export type ConnectionStatus = 'connected' | 'disconnected' | 'sitting_out';

export type InternalPlayer = {
  playerId: string;
  displayName: string;
  avatar?: string;
  role: PlayerRole;
  seat: number | null;
  stack: number;
  connected: boolean;
  /** Presence for reconnection policy. */
  connectionStatus: ConnectionStatus;
  disconnectedAt: number | null;
  timeBankMs: number;
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
  /** clientActionId → last broadcast summary for idempotent retries */
  actionResults: Map<string, unknown>;
  emptySince: number | null;
  createdAt: number;
  /** Turn clock */
  turnStartedAt: number | null;
  turnSeat: number | null;
};

export const DEFAULT_CONFIG: RoomConfig = {
  name: 'Poker Night',
  maxPlayers: 8,
  smallBlind: 5,
  bigBlind: 10,
  startingStack: 1000,
  mode: 'cash',
  turnTimeoutMs: 30_000,
  timeBankMs: 60_000,
  reconnectWindowMs: 60_000,
};

export const ROOM_DESTROY_GRACE_MS = 30_000;

export function turnTimeoutMs(config: RoomConfig): number {
  return config.turnTimeoutMs ?? DEFAULT_CONFIG.turnTimeoutMs ?? 0;
}

export function timeBankDefaultMs(config: RoomConfig): number {
  return config.timeBankMs ?? DEFAULT_CONFIG.timeBankMs ?? 0;
}

export function reconnectWindowMs(config: RoomConfig): number {
  return config.reconnectWindowMs ?? DEFAULT_CONFIG.reconnectWindowMs ?? 60_000;
}
