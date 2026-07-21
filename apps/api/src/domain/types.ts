import type { HandState } from '@poker/engine';
import type { PlayerRole, RoomConfig, RoomPhase } from '@poker/shared';

export type ConnectionStatus = 'connected' | 'disconnected' | 'sitting_out' | 'eliminated';

export type InternalPlayer = {
  playerId: string;
  displayName: string;
  avatar?: string;
  role: PlayerRole;
  seat: number | null;
  stack: number;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  disconnectedAt: number | null;
  timeBankMs: number;
  rebuyCount: number;
  finishPlace?: number;
  /** Accepted the next hand. Transient: cleared whenever a hand starts. */
  ready: boolean;
  connectionIds: Set<string>;
};

export type TournamentRuntime = {
  levelIndex: number;
  levelStartedAt: number;
  ranking: { playerId: string; displayName: string; place: number }[];
  finished: boolean;
};

export type InternalRoom = {
  roomId: string;
  code: string;
  passwordHash: string;
  hostPlayerId: string;
  phase: RoomPhase;
  config: RoomConfig;
  players: Map<string, InternalPlayer>;
  version: number;
  hand?: HandState;
  processedActionIds: Set<string>;
  actionResults: Map<string, unknown>;
  emptySince: number | null;
  createdAt: number;
  turnStartedAt: number | null;
  turnSeat: number | null;
  tournament: TournamentRuntime;
  handsPlayed: number;
};

export const DEFAULT_CONFIG: RoomConfig = {
  name: 'Poker Night',
  maxPlayers: 9,
  smallBlind: 5,
  bigBlind: 10,
  startingStack: 1000,
  mode: 'cash',
  turnTimeoutMs: 30_000,
  timeBankMs: 60_000,
  reconnectWindowMs: 60_000,
  allowRebuy: true,
  rebuyMax: 3,
  doubleMinimum: false,
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

export function normalizeRoomConfig(partial?: Partial<RoomConfig>): RoomConfig {
  const base = { ...DEFAULT_CONFIG, ...partial };
  // UI may send seconds — normalize if small numbers look like seconds
  if (partial?.turnTimeoutMs !== undefined && partial.turnTimeoutMs > 0 && partial.turnTimeoutMs < 1000) {
    base.turnTimeoutMs = partial.turnTimeoutMs * 1000;
  }
  if (partial?.timeBankMs !== undefined && partial.timeBankMs > 0 && partial.timeBankMs < 1000) {
    base.timeBankMs = partial.timeBankMs * 1000;
  }
  if (
    partial?.reconnectWindowMs !== undefined &&
    partial.reconnectWindowMs > 0 &&
    partial.reconnectWindowMs < 1000
  ) {
    base.reconnectWindowMs = partial.reconnectWindowMs * 1000;
  }
  base.maxPlayers = Math.min(9, Math.max(2, Math.floor(base.maxPlayers || 9)));
  base.startingStack = Math.max(1, Math.floor(base.startingStack || 1000));
  base.smallBlind = Math.max(1, Math.floor(base.smallBlind || 5));
  base.bigBlind = Math.max(base.smallBlind, Math.floor(base.bigBlind || 10));
  base.rebuyMax = Math.max(0, Math.floor(base.rebuyMax ?? 3));
  if (base.mode === 'tournament') {
    base.allowRebuy = false;
  }
  return base;
}
