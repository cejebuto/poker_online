/**
 * Web Worker: runs Monte Carlo without blocking the UI thread.
 * Only receives hero cards + visible community + opponent count — never real rival holes.
 */
import {
  estimateEquity,
  type EquityInput,
  type EquityResult,
} from '@poker/engine';

export type EquityWorkerRequest = {
  id: number;
  input: EquityInput;
};

export type EquityWorkerResponse =
  | { id: number; ok: true; result: EquityResult }
  | { id: number; ok: false; error: string };

self.onmessage = (ev: MessageEvent<EquityWorkerRequest>) => {
  const { id, input } = ev.data;
  try {
    const result = estimateEquity(input);
    const res: EquityWorkerResponse = { id, ok: true, result };
    self.postMessage(res);
  } catch (err) {
    const res: EquityWorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : 'equity failed',
    };
    self.postMessage(res);
  }
};
