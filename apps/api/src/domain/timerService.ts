import type { ActionType } from '@poker/engine';
import { roomRegistry } from './roomRegistry.js';
import { roomLocks } from './lock.js';
import { reconnectWindowMs, turnTimeoutMs, type InternalRoom } from './types.js';
import { hub } from '../ws/hub.js';
import { toPublicRoomState } from './publicState.js';
import { purgeStaleDisconnected } from './roomService.js';
import { newId } from './ids.js';

type TimerKey = string; // roomId:handId:seat:phase

const timers = new Map<TimerKey, ReturnType<typeof setTimeout>>();
const jobDone = new Set<string>(); // idempotent job keys

function jobKey(roomId: string, handId: string, seat: number, phase: string): string {
  return `${roomId}:${handId}:${seat}:${phase}`;
}

function timerKey(roomId: string, handId: string, seat: number): string {
  return `${roomId}:${handId}:${seat}`;
}

export function clearTurnTimer(room: InternalRoom): void {
  if (!room.hand || room.turnSeat === null) return;
  const key = timerKey(room.roomId, room.hand.handId, room.turnSeat);
  const t = timers.get(key);
  if (t) {
    clearTimeout(t);
    timers.delete(key);
  }
}

/**
 * Schedule auto-action when turn timer (+ remaining time bank) expires.
 * Idempotent per (handId, seat, phase).
 */
export function scheduleTurnTimer(room: InternalRoom): void {
  clearTurnTimer(room);
  const hand = room.hand;
  if (!hand || hand.currentToAct === null) return;
  if (hand.phase === 'COMPLETE') return;

  const timeout = turnTimeoutMs(room.config);
  if (!timeout || timeout <= 0) {
    room.turnStartedAt = Date.now();
    room.turnSeat = hand.currentToAct;
    return; // unlimited
  }

  const seat = hand.currentToAct;
  const actor = [...room.players.values()].find((p) => p.seat === seat);
  const bank = actor?.timeBankMs ?? 0;
  const total = timeout + bank;
  room.turnStartedAt = Date.now();
  room.turnSeat = seat;

  const key = timerKey(room.roomId, hand.handId, seat);
  const jkey = jobKey(room.roomId, hand.handId, seat, hand.phase);

  const handle = setTimeout(() => {
    timers.delete(key);
    void runAutoAction(room.roomId, seat, jkey, 'timeout');
  }, total);
  // Don't keep Node process alive solely for timers (tests / idle)
  handle.unref?.();
  timers.set(key, handle);

  // Notify clients of turn timing
  hub.broadcast(room.roomId, {
    type: 'turn:begin',
    seat,
    timeoutMs: timeout,
    timeBankMs: bank,
  });
}

async function runAutoAction(
  roomId: string,
  seat: number,
  jkey: string,
  reason: 'timeout' | 'disconnect',
): Promise<void> {
  if (jobDone.has(jkey)) return;
  jobDone.add(jkey);

  await roomLocks.withLock(roomId, async () => {
    const room = roomRegistry.get(roomId);
    if (!room?.hand || room.hand.currentToAct !== seat) return;
    if (room.hand.phase === 'COMPLETE') return;

    // Consume full time bank on timeout
    const actor = [...room.players.values()].find((p) => p.seat === seat);
    if (actor && reason === 'timeout') {
      actor.timeBankMs = 0;
    }

    const player = actor;
    if (!player) return;

    const toCall =
      room.hand.currentBet -
      (room.hand.players.find((p) => p.seat === seat)?.betThisRound ?? 0);
    const action: ActionType = toCall > 0 ? 'fold' : 'check';

    try {
      // Dynamic import avoids circular dependency with handService
      const { applyPlayerAction } = await import('./handService.js');
      const bc = applyPlayerAction(room, {
        playerId: player.playerId,
        handId: room.hand.handId,
        action,
        clientActionId: `auto:${jkey}`,
      });
      hub.broadcast(roomId, {
        type: 'player:auto_acted',
        seat,
        action,
        reason,
      });
      // re-export broadcast path via hub snapshots
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
      if (bc.result) {
        hub.broadcast(roomId, {
          type: 'hand:result',
          winners: bc.result.winners,
          payouts: bc.result.payouts,
        });
      }
      hub.broadcastMap(roomId, (s) => {
        if (!s.playerId) return null;
        return {
          type: 'state:snapshot',
          roomState: toPublicRoomState(room, s.playerId),
        };
      });
      if (room.hand && room.hand.currentToAct !== null && room.phase === 'IN_HAND') {
        scheduleTurnTimer(room);
      }
    } catch (err) {
      console.warn('[timer] auto-action failed', (err as Error).message);
      jobDone.delete(jkey); // allow retry
    }
  });
}

/** After disconnect window: sit out if still disconnected. */
export function scheduleDisconnectWatch(roomId: string, playerId: string): void {
  const room = roomRegistry.get(roomId);
  if (!room) return;
  const windowMs = reconnectWindowMs(room.config);
  const t = setTimeout(() => {
    void roomLocks.withLock(roomId, () => {
      const r = roomRegistry.get(roomId);
      if (!r) return;
      const p = r.players.get(playerId);
      if (!p || p.connected) return;
      if (p.connectionStatus !== 'disconnected') return;

      const inLiveHand =
        r.hand && r.hand.phase !== 'COMPLETE' && p.seat !== null &&
        r.hand.players.some((hp) => hp.seat === p.seat);

      if (inLiveHand) {
        // Still committed to the pot: keep the seat, sit them out, and auto-act
        // if it is their turn. purgeStaleDisconnected removes them once the hand ends.
        p.connectionStatus = 'sitting_out';
        r.version += 1;
        if (r.hand!.currentToAct === p.seat) {
          const jkey = jobKey(r.roomId, r.hand!.handId, p.seat!, `${r.hand!.phase}:disconnect`);
          void runAutoAction(r.roomId, p.seat!, jkey, 'disconnect');
          return;
        }
      } else {
        purgeStaleDisconnected(r);
      }
      hub.broadcastMap(roomId, (s) =>
        s.playerId
          ? { type: 'state:snapshot', roomState: toPublicRoomState(r, s.playerId) }
          : null,
      );
    });
  }, windowMs);
  t.unref?.();
}

/** Slowly recharge time bank between hands (simple model). */
export function rechargeTimeBanks(room: InternalRoom): void {
  const max = room.config.timeBankMs ?? 60_000;
  for (const p of room.players.values()) {
    if (p.role === 'mesa') continue;
    p.timeBankMs = Math.min(max, p.timeBankMs + Math.floor(max * 0.1));
  }
}

export function onTurnConsumedBank(room: InternalRoom, seat: number, elapsedMs: number): void {
  const timeout = turnTimeoutMs(room.config);
  if (!timeout) return;
  const over = elapsedMs - timeout;
  if (over <= 0) return;
  const actor = [...room.players.values()].find((p) => p.seat === seat);
  if (!actor) return;
  actor.timeBankMs = Math.max(0, actor.timeBankMs - over);
}

export function makeClientActionId(): string {
  return newId('act');
}

/** Test helper: clear all timers */
export function _clearAllTimersForTests(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  jobDone.clear();
}
