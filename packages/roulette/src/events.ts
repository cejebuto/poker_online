/**
 * The roulette WebSocket contract — a discriminated union in each direction,
 * shared by the api and the web the same way the poker `events.ts` is, but on
 * its own channel (`/roulette`) so the two games never share a wire.
 */

export type RoundPhase = 'BETTING' | 'SPINNING' | 'PAYOUT';

export type PublicRoulettePlayer = {
  id: string;
  name: string;
  avatar?: string;
  balance: number;
  connected: boolean;
  /** Total this player has staked in the current round. */
  roundStaked: number;
};

export type PublicRouletteState = {
  roundId: string;
  phase: RoundPhase;
  /** ms epoch when the current phase ends (drives the countdown). */
  endsAt: number;
  /** Winning pocket index once the spin is decided (SPINNING/PAYOUT); else null. */
  winningIndex: number | null;
  players: PublicRoulettePlayer[];
  /** Recent winning pocket indices, newest first. */
  history: number[];
};

/** One stacked bet on a board spot, from the viewer's own point of view. */
export type MyBet = { spot: string; amount: number };

export type RouletteClientEvent =
  | { type: 'join'; id: string; name: string; avatar?: string }
  | { type: 'bet'; spot: string; amount: number }
  | { type: 'clearBets' }
  | { type: 'topUp' };

export type RouletteServerEvent =
  | { type: 'state'; state: PublicRouletteState }
  | { type: 'you'; balance: number; bets: MyBet[] }
  | { type: 'spin'; roundId: string; winningIndex: number }
  | { type: 'result'; roundId: string; winningIndex: number; payout: number; balance: number }
  | { type: 'error'; message: string };
