import {
  applyAction,
  createCryptoRng,
  startHand,
  type ActionType,
  type DomainEvent,
  type HandState,
} from '@poker/engine';
import type { Card } from '@poker/shared';
import type { InternalRoom } from './types.js';
import { newId } from './ids.js';

export type HandBroadcast = {
  /** Domain events for logging / projection. */
  domainEvents: DomainEvent[];
  /** Per-player private deal. */
  deals: { playerId: string; cards: Card[] }[];
  /** Public community update if any. */
  community?: { cards: Card[]; phase: string };
  turn?: { seat: number };
  acted?: { seat: number; action: ActionType; amount: number };
  pots?: { amount: number; eligibleSeats: number[] }[];
  showdown?: { hands: { seat: number; cards: Card[] }[] };
  result?: { winners: number[]; payouts: Record<number, number> };
  /** True when hand finished (COMPLETE). */
  handComplete: boolean;
};

function fail(code: string, message: string): never {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  throw e;
}

function seatToPlayerId(room: InternalRoom, seat: number): string | undefined {
  return [...room.players.values()].find((p) => p.seat === seat && p.role !== 'mesa')?.playerId;
}

function syncStacksFromHand(room: InternalRoom, hand: HandState): void {
  for (const hp of hand.players) {
    const playerId = seatToPlayerId(room, hp.seat);
    if (!playerId) continue;
    const p = room.players.get(playerId);
    if (p) p.stack = hp.stack;
  }
}

function extractFromDomain(
  room: InternalRoom,
  hand: HandState,
  events: DomainEvent[],
): HandBroadcast {
  const out: HandBroadcast = {
    domainEvents: events,
    deals: [],
    handComplete: hand.phase === 'COMPLETE',
  };

  for (const ev of events) {
    if (ev.type === 'hand:dealt') {
      for (const seat of ev.seats) {
        const playerId = seatToPlayerId(room, seat);
        const hp = hand.players.find((p) => p.seat === seat);
        if (playerId && hp) {
          out.deals.push({ playerId, cards: hp.holeCards.map((c) => ({ ...c })) });
        }
      }
    }
    if (ev.type === 'street:dealt') {
      out.community = { cards: ev.community.map((c) => ({ ...c })), phase: ev.phase };
    }
    if (ev.type === 'turn:begin') {
      out.turn = { seat: ev.seat };
    }
    if (ev.type === 'player:acted') {
      out.acted = {
        seat: ev.seat,
        action: ev.action as ActionType,
        amount: ev.amount,
      };
    }
    if (ev.type === 'hand:payout') {
      const winners = Object.entries(ev.payouts)
        .filter(([, a]) => a > 0)
        .map(([s]) => Number(s));
      out.result = { winners, payouts: { ...ev.payouts } };
    }
    if (ev.type === 'hand:complete' || ev.type === 'hand:folded_out') {
      out.handComplete = true;
    }
  }

  if (hand.phase === 'COMPLETE' && hand.pots.length) {
    out.pots = hand.pots.map((p) => ({
      amount: p.amount,
      eligibleSeats: [...p.eligibleSeats],
    }));
  }

  // Showdown reveal only when showdown happened (not fold-out)
  if (events.some((e) => e.type === 'showdown:resolved')) {
    out.showdown = {
      hands: hand.players
        .filter((p) => p.status !== 'FOLDED')
        .map((p) => ({ seat: p.seat, cards: p.holeCards.map((c) => ({ ...c })) })),
    };
  }

  return out;
}

export function startRoomHand(room: InternalRoom): HandBroadcast {
  if (room.phase === 'IN_HAND' && room.hand && room.hand.phase !== 'COMPLETE') {
    fail('HAND_IN_PROGRESS', 'A hand is already in progress');
  }
  const seated = [...room.players.values()].filter(
    (p) => p.role !== 'mesa' && p.seat !== null && p.stack > 0,
  );
  if (seated.length < 2) fail('NOT_ENOUGH_PLAYERS', 'Need at least 2 players with chips');

  // Rotate button from previous hand or start at host seat
  let button = room.hand?.button ?? seated[0]!.seat!;
  if (room.hand?.phase === 'COMPLETE') {
    const seats = seated.map((p) => p.seat!).sort((a, b) => a - b);
    const idx = seats.indexOf(button);
    button = seats[(idx + 1) % seats.length]!;
  }

  const stacks: Record<number, number> = {};
  for (const p of seated) {
    stacks[p.seat!] = p.stack;
  }

  const result = startHand(
    {
      handId: newId('hand'),
      stacks,
      button,
      smallBlind: room.config.smallBlind,
      bigBlind: room.config.bigBlind,
    },
    createCryptoRng(),
  );
  if (!result.ok) fail(result.error.code, result.error.message);

  room.hand = result.value.state;
  room.phase = result.value.state.phase === 'COMPLETE' ? 'LOBBY' : 'IN_HAND';
  room.version += 1;
  room.processedActionIds.clear();
  syncStacksFromHand(room, room.hand);

  const broadcast = extractFromDomain(room, room.hand, result.value.events);
  if (room.hand.phase === 'COMPLETE') {
    room.phase = 'LOBBY';
  }
  return broadcast;
}

export function applyPlayerAction(
  room: InternalRoom,
  input: {
    playerId: string;
    handId: string;
    action: ActionType;
    amount?: number;
    clientActionId: string;
  },
): HandBroadcast {
  if (!room.hand || room.hand.phase === 'COMPLETE') {
    fail('NO_HAND', 'No active hand');
  }
  if (room.hand.handId !== input.handId) {
    fail('WRONG_HAND', 'handId does not match active hand');
  }
  if (room.processedActionIds.has(input.clientActionId)) {
    // Idempotent: return empty broadcast (caller can re-send snapshot)
    return {
      domainEvents: [],
      deals: [],
      handComplete: false,
    };
  }

  const player = room.players.get(input.playerId);
  if (!player || player.seat === null || player.role === 'mesa') {
    fail('FORBIDDEN', 'Not a seated player');
  }

  const engineAction = {
    seat: player.seat,
    type: input.action,
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
  };

  const result = applyAction(room.hand, engineAction);
  if (!result.ok) fail(result.error.code, result.error.message);

  room.hand = result.value.state;
  room.processedActionIds.add(input.clientActionId);
  room.version += 1;
  syncStacksFromHand(room, room.hand);

  const broadcast = extractFromDomain(room, room.hand, result.value.events);
  if (room.hand.phase === 'COMPLETE') {
    room.phase = 'LOBBY';
  }
  return broadcast;
}
