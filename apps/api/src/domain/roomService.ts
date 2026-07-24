import type { RoomConfig, UserInfo } from '@poker/shared';
import { ROOM_DELETE_ADMIN_NAME, sanitizeDisplayName } from '@poker/shared';
import { hashPassword, validateRoomPassword, verifyPassword } from '../auth/password.js';
import { signSession } from '../auth/jwt.js';
import { env } from '../config/env.js';
import { newId, newRoomCode } from './ids.js';
import { roomRegistry } from './roomRegistry.js';
import {
  ROOM_DESTROY_GRACE_MS,
  normalizeRoomConfig,
  reconnectWindowMs,
  timeBankDefaultMs,
  type InternalPlayer,
  type InternalRoom,
} from './types.js';
import { prisma } from '../persistence/prisma.js';
import { saveSnapshot } from '../persistence/eventStore.js';

export type ServiceError = { code: string; message: string };

function fail(code: string, message: string): never {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  throw e;
}

function assignSeat(room: InternalRoom): number {
  const used = new Set(
    [...room.players.values()].filter((p) => p.role !== 'mesa' && p.seat !== null).map((p) => p.seat!),
  );
  for (let s = 0; s < room.config.maxPlayers; s++) {
    if (!used.has(s)) return s;
  }
  fail('ROOM_FULL', 'Room is full');
}

function playingCount(room: InternalRoom): number {
  return [...room.players.values()].filter((p) => p.role !== 'mesa').length;
}

async function persistRoomMeta(room: InternalRoom): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.room.upsert({
      where: { id: room.roomId },
      create: {
        id: room.roomId,
        code: room.code,
        passwordHash: room.passwordHash,
        hostPlayerId: room.hostPlayerId,
        phase: room.phase,
        config: room.config as object,
        version: room.version,
      },
      update: {
        phase: room.phase,
        config: room.config as object,
        version: room.version,
        hostPlayerId: room.hostPlayerId,
      },
    });
  } catch (err) {
    // Postgres may be down in unit tests — hot state still works
    console.warn('[room] persist skipped', (err as Error).message);
  }
}

export async function createRoom(input: {
  password: string;
  user: UserInfo;
  config?: Partial<RoomConfig>;
  connectionId: string;
}): Promise<{
  room: InternalRoom;
  player: InternalPlayer;
  token: string;
  joinUrl: string;
  qrPayload: string;
}> {
  const pwdErr = validateRoomPassword(input.password);
  if (pwdErr) fail('INVALID_PASSWORD_FORMAT', pwdErr);
  const displayName = sanitizeDisplayName(input.user.displayName ?? '');
  if (!displayName) fail('INVALID_USER', 'displayName required');

  const passwordHash = await hashPassword(input.password);
  const roomId = newId('room');
  let code = newRoomCode();
  while (roomRegistry.getByCode(code)) code = newRoomCode();

  const playerId = newId('pl');
  const config = normalizeRoomConfig({
    ...input.config,
    name: sanitizeDisplayName(input.config?.name ?? 'Poker Night') || 'Poker Night',
  });

  const player: InternalPlayer = {
    playerId,
    displayName,
    ...(input.user.avatar ? { avatar: input.user.avatar.slice(0, 8) } : {}),
    role: 'host',
    seat: 0,
    stack: config.startingStack,
    connected: true,
    connectionStatus: 'connected',
    disconnectedAt: null,
    timeBankMs: timeBankDefaultMs(config),
    rebuyCount: 0,
    ready: false,
    connectionIds: new Set([input.connectionId]),
  };

  const room: InternalRoom = {
    roomId,
    code,
    passwordHash,
    hasPassword: input.password !== '',
    hostPlayerId: playerId,
    phase: 'LOBBY',
    config,
    players: new Map([[playerId, player]]),
    version: 1,
    processedActionIds: new Set(),
    actionResults: new Map(),
    emptySince: null,
    createdAt: Date.now(),
    turnStartedAt: null,
    turnSeat: null,
    tournament: {
      levelIndex: 0,
      levelStartedAt: Date.now(),
      ranking: [],
      finished: false,
    },
    handsPlayed: 0,
  };

  roomRegistry.set(room);
  await persistRoomMeta(room);
  await saveSnapshot(room);

  const { metrics } = await import('../observability/metrics.js');
  metrics.roomsCreated += 1;
  const { logger } = await import('../observability/logger.js');
  logger.info('room:created', { roomId, code, hostPlayerId: playerId });

  const token = signSession({
    playerId,
    roomId,
    role: 'host',
    seat: 0,
  });
  const joinUrl = `${env.webOrigin.replace(/\/$/, '')}/join/${roomId}`;
  return { room, player, token, joinUrl, qrPayload: joinUrl };
}

export async function joinRoom(input: {
  roomId?: string;
  code?: string;
  password: string;
  user: UserInfo;
  connectionId: string;
  asMesa?: boolean;
}): Promise<{ room: InternalRoom; player: InternalPlayer; token: string }> {
  const room =
    (input.roomId && roomRegistry.get(input.roomId)) ||
    (input.code && roomRegistry.getByCode(input.code)) ||
    undefined;
  if (!room || room.phase === 'CLOSED' || room.phase === 'FINISHED') {
    fail('ROOM_NOT_FOUND', 'Room not found');
  }

  const ok = await verifyPassword(input.password, room.passwordHash);
  if (!ok) fail('BAD_PASSWORD', 'Incorrect room password');

  if (input.asMesa) {
    const playerId = newId('mesa');
    const player: InternalPlayer = {
      playerId,
      displayName: 'Mesa',
      role: 'mesa',
      seat: null,
      stack: 0,
      connected: true,
      connectionStatus: 'connected',
      disconnectedAt: null,
      timeBankMs: 0,
      rebuyCount: 0,
      ready: false,
      connectionIds: new Set([input.connectionId]),
    };
    room.players.set(playerId, player);
    room.version += 1;
    room.emptySince = null;
    const token = signSession({
      playerId,
      roomId: room.roomId,
      role: 'mesa',
      seat: null,
    });
    return { room, player, token };
  }

  const displayName = sanitizeDisplayName(input.user.displayName ?? '');
  if (!displayName) fail('INVALID_USER', 'displayName required');
  if (playingCount(room) >= room.config.maxPlayers) fail('ROOM_FULL', 'Room is full');
  if (room.phase === 'IN_HAND' && room.config.mode === 'tournament') {
    fail('TOURNAMENT_IN_PROGRESS', 'Cannot join tournament mid-hand');
  }

  const seat = assignSeat(room);
  const playerId = newId('pl');
  const player: InternalPlayer = {
    playerId,
    displayName,
    ...(input.user.avatar ? { avatar: input.user.avatar.slice(0, 8) } : {}),
    role: 'player',
    seat,
    stack: room.config.startingStack,
    connected: true,
    connectionStatus: 'connected',
    disconnectedAt: null,
    timeBankMs: timeBankDefaultMs(room.config),
    rebuyCount: 0,
    ready: false,
    connectionIds: new Set([input.connectionId]),
  };
  room.players.set(playerId, player);
  room.version += 1;
  room.emptySince = null;
  await persistRoomMeta(room);

  const token = signSession({
    playerId,
    roomId: room.roomId,
    role: 'player',
    seat,
  });
  return { room, player, token };
}

export function attachConnection(
  room: InternalRoom,
  playerId: string,
  connectionId: string,
): InternalPlayer {
  const player = room.players.get(playerId);
  if (!player) fail('PLAYER_NOT_FOUND', 'Player not in room');
  player.connectionIds.add(connectionId);
  player.connected = true;
  // Reconnect: leave sitting_out until host re-seats? Spec: recover seat and cards.
  if (player.connectionStatus === 'disconnected' || player.connectionStatus === 'sitting_out') {
    player.connectionStatus = 'connected';
  }
  player.disconnectedAt = null;
  room.emptySince = null;
  room.version += 1;
  return player;
}

export function detachConnection(
  roomId: string,
  playerId: string,
  connectionId: string,
): { room: InternalRoom | null; left: boolean } {
  const room = roomRegistry.get(roomId);
  if (!room) return { room: null, left: false };
  const player = room.players.get(playerId);
  if (!player) return { room, left: false };
  player.connectionIds.delete(connectionId);
  if (player.connectionIds.size === 0) {
    player.connected = false;
    if (player.role !== 'mesa') {
      player.connectionStatus = 'disconnected';
      player.disconnectedAt = Date.now();
    }
  }
  // A host who just dropped must not keep the crown, or the table stalls until
  // the purge window elapses. Hand it over immediately if anyone can take it.
  reassignHostIfAbsent(room);
  room.version += 1;
  scheduleDestroyIfEmpty(room);
  return { room, left: false };
}

/** Hand the crown to the first seated successor. No-op if the leaver was not host. */
function promoteSuccessorIfHost(room: InternalRoom, leaver: InternalPlayer): void {
  if (leaver.role !== 'host') return;
  const nextHost = [...room.players.values()].find((p) => p.role !== 'mesa');
  if (nextHost) {
    nextHost.role = 'host';
    room.hostPlayerId = nextHost.playerId;
  }
}

/**
 * Move the crown off a host who is no longer connected, provided someone else can
 * hold it. This unblocks a table where the host dropped: without a present host,
 * the first hand can never be started. A reconnecting ex-host does not get it back.
 */
export function reassignHostIfAbsent(room: InternalRoom): string | null {
  const host = room.players.get(room.hostPlayerId);
  if (host?.connected) return null;
  const successor = [...room.players.values()].find(
    (p) => p.role !== 'mesa' && p.connected,
  );
  if (!successor) return null;
  if (host) host.role = 'player';
  successor.role = 'host';
  room.hostPlayerId = successor.playerId;
  room.version += 1;
  return successor.playerId;
}

/**
 * Remove players who dropped and never came back within the reconnect window.
 * A player still contesting a live hand is spared until the hand resolves — the
 * pot and side-pot math need their seat. Returns the ids removed.
 */
export function purgeStaleDisconnected(room: InternalRoom, now = Date.now()): string[] {
  const windowMs = reconnectWindowMs(room.config);
  const handLive = Boolean(room.hand && room.hand.phase !== 'COMPLETE');
  const removed: string[] = [];
  for (const p of [...room.players.values()]) {
    if (p.role === 'mesa' || p.connected) continue;
    if (p.disconnectedAt === null || now - p.disconnectedAt < windowMs) continue;
    // Spare a seat the current hand still depends on.
    if (handLive && p.seat !== null && room.hand!.players.some((hp) => hp.seat === p.seat)) {
      continue;
    }
    leaveRoom(room, p.playerId);
    removed.push(p.playerId);
  }
  return removed;
}

export function leaveRoom(room: InternalRoom, playerId: string): void {
  const player = room.players.get(playerId);
  if (!player) return;
  room.players.delete(playerId);
  promoteSuccessorIfHost(room, player);
  room.version += 1;
  scheduleDestroyIfEmpty(room);
  void persistRoomMeta(room);
}

export function kickPlayer(room: InternalRoom, hostId: string, targetId: string): InternalPlayer {
  if (room.hostPlayerId !== hostId) fail('FORBIDDEN', 'Only host can kick');
  if (targetId === hostId) fail('FORBIDDEN', 'Host cannot kick self');
  const target = room.players.get(targetId);
  if (!target) fail('PLAYER_NOT_FOUND', 'Player not found');
  // A connected player may only be removed between hands; an offline one can go
  // any time so a dropped seat cannot freeze a live hand.
  if (room.phase === 'IN_HAND' && target.connected) {
    fail('INVALID_PHASE', 'Cannot kick an active player during a hand');
  }
  room.players.delete(targetId);
  room.version += 1;
  return target;
}

export function reorderSeats(room: InternalRoom, hostId: string, seatOrder: number[]): void {
  if (room.hostPlayerId !== hostId) fail('FORBIDDEN', 'Only host can reorder seats');
  if (room.phase !== 'LOBBY') fail('INVALID_PHASE', 'Can only reorder in lobby');
  const seated = [...room.players.values()].filter((p) => p.role !== 'mesa' && p.seat !== null);
  if (seatOrder.length !== seated.length) {
    fail('INVALID_SEATS', 'seatOrder must include every seated player seat once');
  }
  const bySeat = new Map(seated.map((p) => [p.seat!, p]));
  seatOrder.forEach((oldSeat, newSeat) => {
    const p = bySeat.get(oldSeat);
    if (!p) fail('INVALID_SEATS', `Unknown seat ${oldSeat}`);
    p.seat = newSeat;
  });
  room.version += 1;
}

export function updateConfig(
  room: InternalRoom,
  hostId: string,
  patch: Partial<RoomConfig>,
): void {
  if (room.hostPlayerId !== hostId) fail('FORBIDDEN', 'Only host can update config');
  if (room.phase !== 'LOBBY') fail('INVALID_PHASE', 'Config locked during hand');
  room.config = normalizeRoomConfig({ ...room.config, ...patch });
  room.version += 1;
  void persistRoomMeta(room);
}

const destroyTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleDestroyIfEmpty(room: InternalRoom): void {
  const humans = [...room.players.values()].filter((p) => p.role !== 'mesa');
  const anyConnected = humans.some((p) => p.connected);
  if (humans.length === 0 || !anyConnected) {
    room.emptySince = room.emptySince ?? Date.now();
    if (destroyTimers.has(room.roomId)) return;
    const t = setTimeout(() => {
      destroyTimers.delete(room.roomId);
      const current = roomRegistry.get(room.roomId);
      if (!current) return;
      const still = [...current.players.values()].filter((p) => p.role !== 'mesa' && p.connected);
      if (still.length === 0) {
        current.phase = 'CLOSED';
        void persistRoomMeta(current).finally(() => {
          roomRegistry.delete(current.roomId);
          console.log(JSON.stringify({ msg: 'room:destroyed', roomId: current.roomId }));
        });
      }
    }, ROOM_DESTROY_GRACE_MS);
    t.unref?.();
    destroyTimers.set(room.roomId, t);
  } else {
    room.emptySince = null;
    clearDestroyTimer(room.roomId);
  }
}

function clearDestroyTimer(roomId: string): void {
  const t = destroyTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    destroyTimers.delete(roomId);
  }
}

/**
 * Admin force-delete from the home directory.
 * Requires exact `ROOM_DELETE_ADMIN_NAME` and exactly one human player
 * (mesa screens do not count toward the solo check but are also evicted).
 * @returns playerIds that were in the room (for disconnect / kick fan-out).
 */
export function forceDeleteSoloRoom(room: InternalRoom, actorDisplayName: string): string[] {
  if (actorDisplayName !== ROOM_DELETE_ADMIN_NAME) {
    fail('FORBIDDEN', 'Only the admin user can delete rooms');
  }
  const humans = [...room.players.values()].filter((p) => p.role !== 'mesa');
  if (humans.length !== 1) {
    fail('INVALID_STATE', 'Room can only be deleted when exactly one player remains');
  }
  const evictedIds = [...room.players.keys()];
  room.players.clear();
  room.phase = 'CLOSED';
  room.version += 1;
  room.emptySince = Date.now();
  clearDestroyTimer(room.roomId);
  roomRegistry.delete(room.roomId);
  void persistRoomMeta(room);
  console.log(
    JSON.stringify({
      msg: 'room:force-deleted',
      roomId: room.roomId,
      by: ROOM_DELETE_ADMIN_NAME,
    }),
  );
  return evictedIds;
}

export function getServiceError(err: unknown): ServiceError {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const e = err as { code: unknown; message: unknown };
    return { code: String(e.code), message: String(e.message) };
  }
  return { code: 'INTERNAL', message: err instanceof Error ? err.message : 'Unknown error' };
}
