/**
 * Shared WebSocket event contracts.
 * api and web import these types — never redefine them locally.
 */

import type { Card } from './cards.js';
import type {
  PublicPlayer,
  PublicRoomState,
  RoomConfig,
  UserInfo,
} from './room.js';

export type PlayerActionName =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all-in';

export type WsClientEvent =
  | { type: 'ping'; requestId?: string }
  | { type: 'session:resume'; token: string }
  | {
      type: 'room:create';
      config: Partial<RoomConfig> & { name?: string };
      password: string;
      user: UserInfo;
    }
  | {
      type: 'room:join';
      roomId?: string;
      code?: string;
      password: string;
      user: UserInfo;
    }
  | {
      type: 'mesa:attach';
      roomId?: string;
      code?: string;
      password: string;
    }
  | { type: 'room:config:update'; patch: Partial<RoomConfig> }
  | { type: 'room:seats:reorder'; seatOrder: number[] }
  | { type: 'player:kick'; playerId: string }
  | { type: 'player:leave' }
  | { type: 'hand:start' }
  /** Accept (or take back) the next hand. Omit `ready` to accept. */
  | { type: 'hand:ready'; ready?: boolean }
  | {
      type: 'player:action';
      handId: string;
      action: PlayerActionName;
      amount?: number;
      clientActionId: string;
    }
  | {
      type: 'player:rebuy';
      /** Chips to add (defaults to startingStack). */
      amount?: number;
    };

export type WsServerEvent =
  | { type: 'pong'; requestId?: string; ts: number }
  | { type: 'error'; code: string; message: string }
  | {
      type: 'session:resumed';
      roomId: string;
      playerId: string;
      role: string;
    }
  | {
      type: 'room:created';
      roomId: string;
      code: string;
      joinUrl: string;
      qrPayload: string;
      token: string;
      playerId: string;
    }
  | {
      type: 'room:joined';
      roomId: string;
      code: string;
      token: string;
      playerId: string;
      role: string;
    }
  | { type: 'player:joined'; player: PublicPlayer }
  | { type: 'player:left'; playerId: string }
  | { type: 'player:kicked'; playerId: string }
  | { type: 'state:snapshot'; roomState: PublicRoomState }
  | { type: 'state:patch'; version: number; roomState: PublicRoomState }
  | { type: 'hand:dealt'; yourCards: Card[] }
  | { type: 'hand:community'; cards: Card[]; phase: string }
  | {
      type: 'turn:begin';
      seat: number;
      timeoutMs?: number;
      timeBankMs?: number;
    }
  | {
      type: 'player:acted';
      seat: number;
      action: PlayerActionName;
      amount: number;
    }
  | {
      type: 'pot:update';
      pots: { amount: number; eligibleSeats: number[] }[];
    }
  | {
      type: 'showdown:reveal';
      hands: { seat: number; cards: Card[] }[];
    }
  | {
      type: 'hand:result';
      winners: number[];
      payouts: Record<number, number>;
    }
  | {
      type: 'timer:tick';
      seat: number;
      remainingMs: number;
      timeBankMs: number;
    }
  | {
      type: 'player:auto_acted';
      seat: number;
      action: PlayerActionName;
      reason: 'timeout' | 'disconnect';
    }
  | {
      type: 'player:rebuy_ok';
      playerId: string;
      stack: number;
      rebuyCount: number;
    }
  | {
      type: 'tournament:level';
      levelIndex: number;
      smallBlind: number;
      bigBlind: number;
      levelEndsAt: number | null;
    }
  | {
      type: 'tournament:finished';
      ranking: { playerId: string; displayName: string; place: number }[];
    };

export type HealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  postgres?: 'up' | 'down';
  redis?: 'up' | 'down';
};

export type JwtClaims = {
  playerId: string;
  roomId: string;
  role: 'host' | 'player' | 'mesa';
  seat: number | null;
};
