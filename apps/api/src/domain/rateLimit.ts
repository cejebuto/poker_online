/**
 * Simple in-memory rate limiter (per connection / key).
 * Medium security — not a substitute for edge DDoS protection.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

/**
 * @param key e.g. connectionId:action
 * @param limit max events in window
 * @param windowMs window length
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  return { ok: true };
}

/** Test helper */
export function _resetRateLimits(): void {
  buckets.clear();
}

// Defaults tuned for “normal play OK, spam blocked”
export const RL = {
  join: { limit: 8, windowMs: 60_000 },
  action: { limit: 40, windowMs: 10_000 },
  create: { limit: 5, windowMs: 60_000 },
  rebuy: { limit: 10, windowMs: 60_000 },
  general: { limit: 120, windowMs: 60_000 },
} as const;
