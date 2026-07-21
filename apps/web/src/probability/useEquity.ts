import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '@poker/shared';
import { cardCode } from '@poker/shared';
import {
  iterationsForStreet,
  type EquityResult,
} from '@poker/engine';
import type { EquityWorkerRequest, EquityWorkerResponse } from './equity.worker';

const TOGGLE_KEY = 'poker.equity.enabled';

export function loadEquityEnabled(): boolean {
  try {
    const v = localStorage.getItem(TOGGLE_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function saveEquityEnabled(on: boolean): void {
  try {
    localStorage.setItem(TOGGLE_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

export type UseEquityArgs = {
  hero: Card[] | undefined;
  community: Card[];
  /** Opponents still contesting (not folded), excluding hero. */
  opponents: number;
  enabled: boolean;
};

export type UseEquityState = {
  result: EquityResult | null;
  calculating: boolean;
  error: string | null;
};

function cardsKey(cards: readonly Card[] | undefined): string {
  if (!cards?.length) return '';
  return cards.map((c) => cardCode(c)).join(',');
}

/**
 * Runs equity in a Web Worker; cancels/supersedes when inputs change.
 * No network — pure client-side.
 */
export function useEquity({
  hero,
  community,
  opponents,
  enabled,
}: UseEquityArgs): UseEquityState {
  const [result, setResult] = useState<EquityResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);

  const heroKey = useMemo(() => cardsKey(hero), [hero]);
  const boardKey = useMemo(() => cardsKey(community), [community]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./equity.worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = workerRef.current;
    worker.onmessage = (ev: MessageEvent<EquityWorkerResponse>) => {
      const msg = ev.data;
      if (msg.id !== reqId.current) return; // stale
      setCalculating(false);
      if (msg.ok) {
        setResult(msg.result);
        setError(null);
      } else {
        setError(msg.error);
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !hero || hero.length !== 2 || opponents < 1) {
      setResult(null);
      setCalculating(false);
      setError(null);
      return;
    }

    const id = ++reqId.current;
    setCalculating(true);
    setError(null);

    const iterations = iterationsForStreet(community.length, opponents);
    const payload: EquityWorkerRequest = {
      id,
      input: {
        hero,
        community,
        opponents,
        iterations,
      },
    };
    workerRef.current?.postMessage(payload);
  }, [enabled, heroKey, boardKey, opponents, hero, community]);

  return { result, calculating, error };
}
