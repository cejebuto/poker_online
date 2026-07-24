import { useCallback, useEffect, useRef, useState } from 'react';
import type { MyBet, PublicRouletteState } from '@roulette/core';
import {
  connectRoulette,
  type RouletteHandle,
  type RouletteStatus,
} from './net/rouletteWs';
import { rouletteId } from './rouletteIdentity';

export type SpinTrigger = { roundId: string; winningIndex: number; key: number };
export type RouletteResult = {
  winningIndex: number;
  payout: number;
  /** Chips this player had on the felt when the wheel stopped (0 if they sat out). */
  staked: number;
  key: number;
};

export type RouletteView = {
  status: RouletteStatus;
  state: PublicRouletteState | null;
  balance: number;
  bets: MyBet[];
  spin: SpinTrigger | null;
  result: RouletteResult | null;
  error: string | null;
  placeBet: (spot: string, amount: number) => void;
  clearBets: () => void;
  topUp: () => void;
};

function totalStaked(bets: MyBet[]): number {
  return bets.reduce((sum, b) => sum + b.amount, 0);
}

/** Owns the roulette socket and the derived view state for one screen. */
export function useRoulette(user: { displayName: string; avatar?: string }): RouletteView {
  const [status, setStatus] = useState<RouletteStatus>('connecting');
  const [state, setState] = useState<PublicRouletteState | null>(null);
  const [balance, setBalance] = useState(0);
  const [bets, setBets] = useState<MyBet[]>([]);
  const [spin, setSpin] = useState<SpinTrigger | null>(null);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<RouletteHandle | null>(null);
  const seqRef = useRef(0);
  /** Frozen at spin so "Perdiste" still works after the server clears bets. */
  const stakedAtSpinRef = useRef(0);
  const betsRef = useRef<MyBet[]>([]);
  betsRef.current = bets;

  // The identity is stable; the name/avatar ride along on join.
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const handle = connectRoulette({
      onStatus: setStatus,
      onOpen: () => {
        handle.send({
          type: 'join',
          id: rouletteId(),
          name: userRef.current.displayName,
          ...(userRef.current.avatar ? { avatar: userRef.current.avatar } : {}),
        });
      },
      onEvent: (event) => {
        switch (event.type) {
          case 'state':
            setState(event.state);
            break;
          case 'you':
            setBalance(event.balance);
            setBets(event.bets);
            break;
          case 'spin':
            // Capture stake now — payout phase clears the board before result paints.
            stakedAtSpinRef.current = totalStaked(betsRef.current);
            setSpin({ roundId: event.roundId, winningIndex: event.winningIndex, key: ++seqRef.current });
            break;
          case 'result':
            setResult({
              winningIndex: event.winningIndex,
              payout: event.payout,
              staked: stakedAtSpinRef.current,
              key: ++seqRef.current,
            });
            setBalance(event.balance);
            break;
          case 'error':
            setError(event.message);
            window.setTimeout(() => setError(null), 2200);
            break;
        }
      },
    });
    handleRef.current = handle;
    return () => handle.close();
  }, []);

  const placeBet = useCallback((spot: string, amount: number) => {
    handleRef.current?.send({ type: 'bet', spot, amount });
  }, []);
  const clearBets = useCallback(() => {
    handleRef.current?.send({ type: 'clearBets' });
  }, []);
  const topUp = useCallback(() => {
    handleRef.current?.send({ type: 'topUp' });
  }, []);

  return { status, state, balance, bets, spin, result, error, placeBet, clearBets, topUp };
}
