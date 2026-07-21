import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: LogLevel =
  env.nodeEnv === 'production' ? 'info' : ((process.env.LOG_LEVEL as LogLevel) ?? 'debug');

const SENSITIVE = /password|passwordHash|jwtSecret|token|holeCards|"deck"/i;

function scrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (SENSITIVE.test(value)) return '[redacted]';
    return value;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = scrub(v);
      }
    }
    return out;
  }
  return value;
}

export function log(
  level: LogLevel,
  msg: string,
  fields?: Record<string, unknown>,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields ? (scrub(fields) as object) : {}),
  };
  const s = JSON.stringify(line);
  if (level === 'error') console.error(s);
  else if (level === 'warn') console.warn(s);
  else console.log(s);
}

export const logger = {
  debug: (msg: string, f?: Record<string, unknown>) => log('debug', msg, f),
  info: (msg: string, f?: Record<string, unknown>) => log('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => log('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => log('error', msg, f),
};
