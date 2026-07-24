/** Injectable randomness so spins are deterministic under test. */

export type Rng = () => number;

/** Mulberry32 — a small deterministic PRNG for tests. */
export function createSeededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cryptographically secure RNG for real spins. */
export function createCryptoRng(): Rng {
  return () => {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return (buf[0] ?? 0) / 4294967296;
  };
}

/** Pick a pocket index in [0, count). */
export function pickPocketIndex(rng: Rng, count: number): number {
  return Math.min(count - 1, Math.floor(rng() * count));
}
