import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JwtClaims } from '@poker/shared';
import { env } from '../config/env.js';

const TTL_SEC = 7 * 24 * 60 * 60;

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

function signHs256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function signSession(claims: JwtClaims): string {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson({
    ...claims,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  });
  const body = `${header}.${payload}`;
  const sig = signHs256(body, env.jwtSecret);
  return `${body}.${sig}`;
}

export function verifySession(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts as [string, string, string];
    const body = `${header}.${payload}`;
    const expected = signHs256(body, env.jwtSecret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtClaims & {
      exp?: number;
    };
    if (json.exp && json.exp < Math.floor(Date.now() / 1000)) return null;
    if (!json.playerId || !json.roomId || !json.role) return null;
    return {
      playerId: json.playerId,
      roomId: json.roomId,
      role: json.role,
      seat: json.seat ?? null,
    };
  } catch {
    return null;
  }
}
