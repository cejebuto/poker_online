import type { Card, PublicPlayer, PublicRoomState } from '@poker/shared';
import type { InternalPlayer, InternalRoom } from './types.js';
import { env } from '../config/env.js';

function toPublicPlayer(p: InternalPlayer): PublicPlayer {
  return {
    playerId: p.playerId,
    displayName: p.displayName,
    ...(p.avatar !== undefined ? { avatar: p.avatar } : {}),
    role: p.role,
    seat: p.seat,
    stack: p.stack,
    connected: p.connected,
  };
}

/**
 * Build client-safe room state.
 * Never includes password, passwordHash, deck, or other players' hole cards.
 */
export function toPublicRoomState(
  room: InternalRoom,
  viewerPlayerId: string | null,
): PublicRoomState {
  const players = [...room.players.values()]
    .filter((p) => p.role !== 'mesa')
    .map(toPublicPlayer)
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99));

  // Overlay hand betting info onto players
  if (room.hand) {
    for (const hp of room.hand.players) {
      const pub = players.find((p) => p.seat === hp.seat);
      if (pub) {
        pub.stack = hp.stack;
        pub.status = hp.status;
        pub.betThisRound = hp.betThisRound;
      }
    }
  }

  const joinUrl = `${env.webOrigin.replace(/\/$/, '')}/join/${room.roomId}`;

  const state: PublicRoomState = {
    roomId: room.roomId,
    code: room.code,
    phase: room.phase,
    config: { ...room.config },
    hostPlayerId: room.hostPlayerId,
    players,
    version: room.version,
    joinUrl,
  };

  if (room.hand) {
    let yourCards: Card[] | undefined;
    if (viewerPlayerId) {
      const viewer = room.players.get(viewerPlayerId);
      if (viewer && viewer.seat !== null && viewer.role !== 'mesa') {
        const hp = room.hand.players.find((p) => p.seat === viewer.seat);
        if (hp) yourCards = hp.holeCards.map((c) => ({ ...c }));
      }
    }
    state.hand = {
      handId: room.hand.handId,
      phase: room.hand.phase,
      community: room.hand.community.map((c) => ({ ...c })),
      pots: room.hand.pots.map((p) => ({
        amount: p.amount,
        eligibleSeats: [...p.eligibleSeats],
      })),
      currentToAct: room.hand.currentToAct,
      currentBet: room.hand.currentBet,
      minRaise: room.hand.minRaise,
      button: room.hand.button,
      ...(yourCards ? { yourCards } : {}),
    };
    if (room.hand.phase === 'COMPLETE' && Object.keys(room.hand.payouts).length) {
      const winners = Object.entries(room.hand.payouts)
        .filter(([, amt]) => amt > 0)
        .map(([seat]) => Number(seat));
      state.lastResult = {
        payouts: { ...room.hand.payouts },
        winners,
      };
    }
  }

  return state;
}

/** Deep-scan payloads for private leakage (tests + defensive). */
export function findPrivateLeaks(payload: unknown, viewerPlayerId?: string): string[] {
  const leaks: string[] = [];
  const raw = JSON.stringify(payload);
  if (raw.includes('passwordHash') || /"password"\s*:/.test(raw)) {
    leaks.push('password');
  }
  if (raw.includes('"deck"')) {
    leaks.push('deck');
  }
  // Hole cards of others shouldn't appear under foreign player objects
  // yourCards is OK for viewer
  if (typeof payload === 'object' && payload !== null) {
    walk(payload, '', leaks, viewerPlayerId);
  }
  return leaks;
}

function walk(node: unknown, path: string, leaks: string[], viewer?: string): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, leaks, viewer));
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (k === 'holeCards' || k === 'deck' || k === 'passwordHash' || k === 'password') {
      leaks.push(p);
    }
    if (k === 'yourCards' && viewer === undefined) {
      // allowed only when viewer-specific; generic broadcast shouldn't have it
    }
    walk(v, p, leaks, viewer);
  }
}
