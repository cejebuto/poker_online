import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AUTO_NEXT_HAND_MS, loadAutoNextHand, saveAutoNextHand } from '../src/features/autoNextHand.js';

describe('autoNextHand preference', () => {
  it('uses a 2s gap between hands', () => {
    assert.equal(AUTO_NEXT_HAND_MS, 2000);
  });

  it('defaults to on when nothing is stored', () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    try {
      assert.equal(loadAutoNextHand(), true);
      saveAutoNextHand(false);
      assert.equal(loadAutoNextHand(), false);
      saveAutoNextHand(true);
      assert.equal(loadAutoNextHand(), true);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
      });
    }
  });
});
