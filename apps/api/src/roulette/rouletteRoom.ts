import type { PublicRouletteState, RoundPhase } from '@roulette/core';

/** In-memory player at the single roulette table. Balance persists across a
 *  reconnect because we key by the client-supplied id, not the socket. */
export type RoulettePlayer = {
  id: string;
  name: string;
  avatar?: string;
  balance: number;
  /** Live connection ids for this player (0 = offline but remembered). */
  conns: Set<string>;
  /** This round's bets: board spot id → staked amount. */
  bets: Map<string, number>;
};

export type RouletteRoom = {
  players: Map<string, RoulettePlayer>;
  roundId: string;
  phase: RoundPhase;
  /** ms epoch when the current phase ends. */
  endsAt: number;
  winningIndex: number | null;
  history: number[];
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
};

export function createRoom(): RouletteRoom {
  return {
    players: new Map(),
    roundId: '',
    phase: 'BETTING',
    endsAt: 0,
    winningIndex: null,
    history: [],
    timer: null,
    running: false,
  };
}

export function roundStaked(p: RoulettePlayer): number {
  let sum = 0;
  for (const amount of p.bets.values()) sum += amount;
  return sum;
}

export function anyConnected(room: RouletteRoom): boolean {
  for (const p of room.players.values()) if (p.conns.size > 0) return true;
  return false;
}

export function toPublicState(room: RouletteRoom): PublicRouletteState {
  return {
    roundId: room.roundId,
    phase: room.phase,
    endsAt: room.endsAt,
    winningIndex: room.winningIndex,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.avatar ? { avatar: p.avatar } : {}),
      balance: p.balance,
      connected: p.conns.size > 0,
      roundStaked: roundStaked(p),
    })),
    history: room.history,
  };
}
