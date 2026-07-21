import { config as loadDotenv } from 'dotenv';

loadDotenv();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL', 'postgresql://poker:poker@localhost:5432/poker'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  webOrigin: required('WEB_ORIGIN', 'http://localhost:5173'),
};

export type Env = typeof env;
