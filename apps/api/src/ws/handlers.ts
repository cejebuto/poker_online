import type { WsClientEvent, WsServerEvent } from '@poker/shared';
import { sanitizeDisplayName } from '@poker/shared';
import type { ActionType } from '@poker/engine';
import { verifySession } from '../auth/jwt.js';
import { roomLocks } from '../domain/lock.js';
import { roomRegistry } from '../domain/roomRegistry.js';
import { toPublicRoomState } from '../domain/publicState.js';
import {
  attachConnection,
  createRoom,
  detachConnection,
  forceDeleteSoloRoom,
  getServiceError,
  joinRoom,
  kickPlayer,
  leaveRoom,
  reorderSeats,
  updateConfig,
} from '../domain/roomService.js';
import { applyPlayerAction, startRoomHand } from '../domain/handService.js';
import { scheduleDisconnectWatch } from '../domain/timerService.js';
import { applyRebuy } from '../domain/modes.js';
import { readySummary, setPlayerReady } from '../domain/readiness.js';
import { listActiveRooms } from '../domain/roomDirectory.js';
import { RL, rateLimit } from '../domain/rateLimit.js';
import type { ClientSession } from './hub.js';
import { hub } from './hub.js';

function error(code: string, message: string): WsServerEvent {
  return { type: 'error', code, message };
}

/** Current registered-user total to every open socket. */
export function broadcastPresence(): void {
  hub.broadcastAll({ type: 'presence:update', count: hub.countPresent() });
}

/** Snapshot for a single connection (e.g. right after connect). */
export function sendPresence(connectionId: string): void {
  hub.send(connectionId, { type: 'presence:update', count: hub.countPresent() });
}

/**
 * Mark a human connection as a registered app user (pseudonym chosen).
 * Broadcasts only when the global count actually changes.
 * Returns false if the name is unusable or the role is mesa.
 */
export function markPresent(
  session: ClientSession,
  rawName: string | undefined | null,
  opts?: { allowMesa?: boolean },
): boolean {
  if (session.role === 'mesa' && !opts?.allowMesa) return false;
  const raw = (rawName ?? '').trim();
  if (raw.length < 2) return false;
  // Mesa device uses a fixed label — never inflate the human counter.
  if (raw.toLowerCase() === 'mesa') return false;
  const name = sanitizeDisplayName(raw);
  const wasPresent = Boolean(session.displayName);
  session.displayName = name;
  if (!wasPresent) {
    broadcastPresence();
  } else {
    hub.send(session.connectionId, { type: 'presence:update', count: hub.countPresent() });
  }
  return true;
}

function snapshotFor(roomId: string, playerId: string | null): WsServerEvent | null {
  const room = roomRegistry.get(roomId);
  if (!room) return null;
  return {
    type: 'state:snapshot',
    roomState: toPublicRoomState(room, playerId),
  };
}

function broadcastSnapshots(roomId: string): void {
  hub.broadcastMap(roomId, (session) => {
    if (!session.playerId) return null;
    return snapshotFor(roomId, session.playerId);
  });
}

export async function handleClientEvent(
  session: ClientSession,
  event: WsClientEvent,
): Promise<void> {
  try {
    const gen = rateLimit(`${session.connectionId}:gen`, RL.general.limit, RL.general.windowMs);
    if (!gen.ok) {
      hub.send(session.connectionId, {
        type: 'error',
        code: 'RATE_LIMIT',
        message: `Too many requests — retry in ${Math.ceil(gen.retryAfterMs / 1000)}s`,
      });
      return;
    }

    switch (event.type) {
      case 'ping':
        hub.send(session.connectionId, {
          type: 'pong',
          requestId: event.requestId,
          ts: Date.now(),
        });
        return;

      case 'rooms:list':
        hub.send(session.connectionId, {
          type: 'rooms:listed',
          rooms: listActiveRooms(),
        });
        return;

      case 'presence:hello': {
        const rl = rateLimit(`${session.connectionId}:presence`, 10, 60_000);
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many presence updates',
          });
          return;
        }
        if (!markPresent(session, event.displayName)) {
          hub.send(session.connectionId, error('INVALID_USER', 'displayName required'));
        }
        return;
      }

      case 'session:resume': {
        const claims = verifySession(event.token);
        if (!claims) {
          hub.send(session.connectionId, error('INVALID_TOKEN', 'Invalid or expired session'));
          return;
        }
        const room = roomRegistry.get(claims.roomId);
        if (!room || room.phase === 'CLOSED') {
          hub.send(session.connectionId, error('ROOM_NOT_FOUND', 'Room no longer exists'));
          return;
        }
        if (!room.players.has(claims.playerId)) {
          hub.send(session.connectionId, error('PLAYER_NOT_FOUND', 'Player not in room'));
          return;
        }
        await roomLocks.withLock(room.roomId, () => {
          attachConnection(room, claims.playerId, session.connectionId);
        });
        session.playerId = claims.playerId;
        session.roomId = claims.roomId;
        session.role = claims.role;
        // Room occupants already chose a name — count them even without hello.
        if (claims.role !== 'mesa') {
          const occupant = room.players.get(claims.playerId);
          markPresent(session, occupant?.displayName);
        }
        hub.send(session.connectionId, {
          type: 'session:resumed',
          roomId: claims.roomId,
          playerId: claims.playerId,
          role: claims.role,
        });
        const snap = snapshotFor(claims.roomId, claims.playerId);
        if (snap) hub.send(session.connectionId, snap);
        // re-deal private cards if hand active
        const r = roomRegistry.get(claims.roomId);
        if (r?.hand && claims.role !== 'mesa') {
          const player = r.players.get(claims.playerId);
          if (player?.seat !== null && player) {
            const hp = r.hand.players.find((p) => p.seat === player.seat);
            if (hp) {
              hub.send(session.connectionId, {
                type: 'hand:dealt',
                yourCards: hp.holeCards.map((c) => ({ ...c })),
              });
            }
          }
        }
        return;
      }

      case 'room:create': {
        const rl = rateLimit(`${session.connectionId}:create`, RL.create.limit, RL.create.windowMs);
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many room creates',
          });
          return;
        }
        const result = await createRoom({
          password: event.password,
          user: event.user,
          config: event.config,
          connectionId: session.connectionId,
        });
        session.playerId = result.player.playerId;
        session.roomId = result.room.roomId;
        session.role = 'host';
        markPresent(session, result.player.displayName);
        hub.send(session.connectionId, {
          type: 'room:created',
          roomId: result.room.roomId,
          code: result.room.code,
          joinUrl: result.joinUrl,
          qrPayload: result.qrPayload,
          token: result.token,
          playerId: result.player.playerId,
        });
        const snap = snapshotFor(result.room.roomId, result.player.playerId);
        if (snap) hub.send(session.connectionId, snap);
        return;
      }

      case 'room:join':
      case 'mesa:attach': {
        const rl = rateLimit(`${session.connectionId}:join`, RL.join.limit, RL.join.windowMs);
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many join attempts',
          });
          return;
        }
        const asMesa = event.type === 'mesa:attach';
        const result = await joinRoom({
          roomId: event.roomId,
          code: event.code,
          password: event.password,
          user: asMesa ? { displayName: 'Mesa' } : event.type === 'room:join' ? event.user : { displayName: 'Mesa' },
          connectionId: session.connectionId,
          asMesa,
        });
        session.playerId = result.player.playerId;
        session.roomId = result.room.roomId;
        session.role = result.player.role;
        hub.send(session.connectionId, {
          type: 'room:joined',
          roomId: result.room.roomId,
          code: result.room.code,
          token: result.token,
          playerId: result.player.playerId,
          role: result.player.role,
        });
        if (!asMesa) {
          markPresent(session, result.player.displayName);
          hub.broadcast(result.room.roomId, {
            type: 'player:joined',
            player: {
              playerId: result.player.playerId,
              displayName: result.player.displayName,
              ...(result.player.avatar ? { avatar: result.player.avatar } : {}),
              role: result.player.role,
              seat: result.player.seat,
              stack: result.player.stack,
              connected: true,
            },
          });
        }
        broadcastSnapshots(result.room.roomId);
        return;
      }

      case 'room:config:update': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        await roomLocks.withLock(session.roomId, () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          updateConfig(room, session.playerId!, event.patch);
        });
        broadcastSnapshots(session.roomId);
        return;
      }

      case 'room:seats:reorder': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        await roomLocks.withLock(session.roomId, () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          reorderSeats(room, session.playerId!, event.seatOrder);
        });
        broadcastSnapshots(session.roomId);
        return;
      }

      case 'player:kick': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        let kickedId = '';
        await roomLocks.withLock(session.roomId, () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          const target = kickPlayer(room, session.playerId!, event.playerId);
          kickedId = target.playerId;
        });
        hub.broadcast(session.roomId, { type: 'player:kicked', playerId: kickedId });
        hub.broadcastMap(session.roomId, (s) => {
          if (s.playerId === kickedId) {
            hub.send(s.connectionId, error('KICKED', 'You were kicked from the room'));
            s.roomId = undefined;
            s.playerId = undefined;
            s.role = undefined;
          }
          return null;
        });
        broadcastSnapshots(session.roomId);
        return;
      }

      case 'player:leave': {
        if (!session.roomId || !session.playerId) return;
        const roomId = session.roomId;
        const playerId = session.playerId;
        await roomLocks.withLock(roomId, () => {
          const room = roomRegistry.get(roomId);
          if (!room) return;
          leaveRoom(room, playerId);
        });
        hub.broadcast(roomId, { type: 'player:left', playerId });
        session.roomId = undefined;
        session.playerId = undefined;
        session.role = undefined;
        broadcastSnapshots(roomId);
        return;
      }

      case 'room:delete': {
        const rl = rateLimit(`${session.connectionId}:delete`, RL.create.limit, RL.create.windowMs);
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many delete attempts',
          });
          return;
        }
        const roomId = event.roomId;
        let evicted: string[] = [];
        await roomLocks.withLock(roomId, () => {
          const room = roomRegistry.get(roomId);
          if (!room || room.phase === 'CLOSED') failNotFound();
          evicted = forceDeleteSoloRoom(room, event.displayName);
        });
        // Kick every occupant still attached to this room (the solo player + mesa).
        hub.broadcastMap(roomId, (s) => {
          if (s.roomId !== roomId) return null;
          if (s.playerId && evicted.includes(s.playerId)) {
            hub.send(s.connectionId, error('KICKED', 'La mesa fue eliminada'));
          } else {
            hub.send(s.connectionId, error('ROOM_NOT_FOUND', 'La mesa fue eliminada'));
          }
          s.roomId = undefined;
          s.playerId = undefined;
          s.role = undefined;
          return null;
        });
        hub.send(session.connectionId, { type: 'room:deleted', roomId });
        hub.send(session.connectionId, {
          type: 'rooms:listed',
          rooms: listActiveRooms(),
        });
        return;
      }

      case 'hand:start': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        await roomLocks.withLock(session.roomId, async () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          if (room.hostPlayerId !== session.playerId) {
            hub.send(session.connectionId, error('FORBIDDEN', 'Only host can start hand'));
            return;
          }
          const bc = startRoomHand(room);
          emitHandBroadcast(room.roomId, bc);
        });
        return;
      }

      case 'hand:ready': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        await roomLocks.withLock(session.roomId, async () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          if (room.phase === 'IN_HAND') {
            hub.send(session.connectionId, error('HAND_IN_PROGRESS', 'A hand is already running'));
            return;
          }
          setPlayerReady(room, session.playerId!, event.ready ?? true);

          if (readySummary(room).allReady) {
            const bc = startRoomHand(room);
            emitHandBroadcast(room.roomId, bc);
          } else {
            broadcastSnapshots(room.roomId);
          }
        });
        return;
      }

      case 'player:action': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        const rl = rateLimit(
          `${session.connectionId}:action`,
          RL.action.limit,
          RL.action.windowMs,
        );
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many actions',
          });
          return;
        }
        await roomLocks.withLock(session.roomId, async () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          try {
            const bc = applyPlayerAction(room, {
              playerId: session.playerId!,
              handId: event.handId,
              action: event.action as ActionType,
              amount: event.amount,
              clientActionId: event.clientActionId,
            });
            emitHandBroadcast(room.roomId, bc);
            if (room.tournament.finished) {
              hub.broadcast(room.roomId, {
                type: 'tournament:finished',
                ranking: room.tournament.ranking,
              });
            }
          } catch (err) {
            const e = getServiceError(err);
            hub.send(session.connectionId, error(e.code, e.message));
          }
        });
        return;
      }

      case 'player:rebuy': {
        if (!session.roomId || !session.playerId) {
          hub.send(session.connectionId, error('UNAUTHORIZED', 'Not in a room'));
          return;
        }
        const rl = rateLimit(`${session.connectionId}:rebuy`, RL.rebuy.limit, RL.rebuy.windowMs);
        if (!rl.ok) {
          hub.send(session.connectionId, {
            type: 'error',
            code: 'RATE_LIMIT',
            message: 'Too many rebuy attempts',
          });
          return;
        }
        await roomLocks.withLock(session.roomId, () => {
          const room = roomRegistry.get(session.roomId!);
          if (!room) failNotFound();
          try {
            const res = applyRebuy(room, session.playerId!, event.amount);
            hub.broadcast(room.roomId, {
              type: 'player:rebuy_ok',
              playerId: session.playerId!,
              stack: res.stack,
              rebuyCount: res.rebuyCount,
            });
            broadcastSnapshots(room.roomId);
          } catch (err) {
            const e = getServiceError(err);
            hub.send(session.connectionId, error(e.code, e.message));
          }
        });
        return;
      }

      default:
        hub.send(session.connectionId, error('UNSUPPORTED', 'Unknown event'));
    }
  } catch (err) {
    const e = getServiceError(err);
    hub.send(session.connectionId, error(e.code, e.message));
  }
}

function failNotFound(): never {
  const e = new Error('Room not found') as Error & { code: string };
  e.code = 'ROOM_NOT_FOUND';
  throw e;
}

function emitHandBroadcast(
  roomId: string,
  bc: import('../domain/handService.js').HandBroadcast,
): void {
  for (const deal of bc.deals) {
    hub.sendToPlayer(roomId, deal.playerId, {
      type: 'hand:dealt',
      yourCards: deal.cards,
    });
  }
  if (bc.community) {
    hub.broadcast(roomId, {
      type: 'hand:community',
      cards: bc.community.cards,
      phase: bc.community.phase,
    });
  }
  if (bc.acted) {
    hub.broadcast(roomId, {
      type: 'player:acted',
      seat: bc.acted.seat,
      action: bc.acted.action as import('@poker/shared').PlayerActionName,
      amount: bc.acted.amount,
    });
  }
  if (bc.pots) {
    hub.broadcast(roomId, { type: 'pot:update', pots: bc.pots });
  }
  if (bc.showdown) {
    hub.broadcast(roomId, { type: 'showdown:reveal', hands: bc.showdown.hands });
  }
  if (bc.result) {
    hub.broadcast(roomId, {
      type: 'hand:result',
      winners: bc.result.winners,
      payouts: bc.result.payouts,
    });
  }
  if (bc.turn) {
    hub.broadcast(roomId, { type: 'turn:begin', seat: bc.turn.seat });
  }
  // Always send personalized snapshots after state change
  broadcastSnapshots(roomId);
}

export function onDisconnect(session: ClientSession): void {
  if (session.roomId && session.playerId) {
    const roomId = session.roomId;
    const playerId = session.playerId;
    detachConnection(roomId, playerId, session.connectionId);
    scheduleDisconnectWatch(roomId, playerId);
    broadcastSnapshots(roomId);
  }
  const wasPresent = Boolean(session.displayName);
  hub.remove(session.connectionId);
  if (wasPresent) broadcastPresence();
}
