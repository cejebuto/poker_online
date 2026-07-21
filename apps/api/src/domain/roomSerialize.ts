import type { HandState } from '@poker/engine';
import type { InternalPlayer, InternalRoom } from './types.js';

/** JSON-safe room dump for snapshots / Redis. Includes private hand state (server-only). */
export type SerializedRoom = {
  roomId: string;
  code: string;
  passwordHash: string;
  hostPlayerId: string;
  phase: InternalRoom['phase'];
  config: InternalRoom['config'];
  version: number;
  createdAt: number;
  emptySince: number | null;
  turnStartedAt: number | null;
  turnSeat: number | null;
  processedActionIds: string[];
  players: Array<{
    playerId: string;
    displayName: string;
    avatar?: string;
    role: InternalPlayer['role'];
    seat: number | null;
    stack: number;
    connected: boolean;
    connectionStatus: InternalPlayer['connectionStatus'];
    disconnectedAt: number | null;
    timeBankMs: number;
  }>;
  hand?: HandState;
};

export function serializeRoom(room: InternalRoom): SerializedRoom {
  return {
    roomId: room.roomId,
    code: room.code,
    passwordHash: room.passwordHash,
    hostPlayerId: room.hostPlayerId,
    phase: room.phase,
    config: room.config,
    version: room.version,
    createdAt: room.createdAt,
    emptySince: room.emptySince,
    turnStartedAt: room.turnStartedAt,
    turnSeat: room.turnSeat,
    processedActionIds: [...room.processedActionIds],
    players: [...room.players.values()].map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      ...(p.avatar !== undefined ? { avatar: p.avatar } : {}),
      role: p.role,
      seat: p.seat,
      stack: p.stack,
      connected: p.connected,
      connectionStatus: p.connectionStatus,
      disconnectedAt: p.disconnectedAt,
      timeBankMs: p.timeBankMs,
    })),
    ...(room.hand ? { hand: room.hand } : {}),
  };
}

export function deserializeRoom(data: SerializedRoom): InternalRoom {
  const players = new Map<string, InternalPlayer>();
  for (const p of data.players) {
    players.set(p.playerId, {
      playerId: p.playerId,
      displayName: p.displayName,
      ...(p.avatar !== undefined ? { avatar: p.avatar } : {}),
      role: p.role,
      seat: p.seat,
      stack: p.stack,
      connected: false,
      connectionStatus: p.connectionStatus === 'sitting_out' ? 'sitting_out' : 'disconnected',
      disconnectedAt: p.disconnectedAt ?? Date.now(),
      timeBankMs: p.timeBankMs,
      connectionIds: new Set(),
    });
  }
  return {
    roomId: data.roomId,
    code: data.code,
    passwordHash: data.passwordHash,
    hostPlayerId: data.hostPlayerId,
    phase: data.phase,
    config: data.config,
    version: data.version,
    createdAt: data.createdAt,
    emptySince: data.emptySince,
    turnStartedAt: data.turnStartedAt,
    turnSeat: data.turnSeat,
    processedActionIds: new Set(data.processedActionIds),
    actionResults: new Map(),
    players,
    ...(data.hand ? { hand: data.hand } : {}),
  };
}
