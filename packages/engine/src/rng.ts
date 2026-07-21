/** Returns a float in [0, 1). */
export type Rng = () => number;

/** Mulberry32 — small deterministic PRNG for tests. */
export function createSeededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cryptographically secure RNG for production dealing. */
export function createCryptoRng(): Rng {
  return () => {
    const buf = new Uint32Array(1);
    // node:crypto webcrypto — works in Node 20+ without DOM types
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] ?? 0) / 4294967296;
  };
}
