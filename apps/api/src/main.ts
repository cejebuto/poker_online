import http from 'node:http';
import cors from 'cors';
import express, { json as expressJson } from 'express';
import type { HealthResponse } from '@poker/shared';
import { getEngineInfo } from '@poker/engine';
import { env } from './config/env.js';
import { checkPostgres, prisma } from './persistence/prisma.js';
import { checkRedis, redis } from './cache/redis.js';
import { attachWebSocket } from './ws/gateway.js';
import { hydrateRoomsFromSnapshots } from './domain/hydrate.js';
import { roomPubSub } from './cache/roomPubSub.js';
import { listHandHistory } from './persistence/eventStore.js';

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(
    cors({
      origin: env.webOrigin,
    }),
  );
  app.use(expressJson());

  app.get('/health', async (_req, res) => {
    const [postgresUp, redisUp] = await Promise.all([checkPostgres(), checkRedis()]);
    const body: HealthResponse = {
      status: postgresUp && redisUp ? 'ok' : 'degraded',
      postgres: postgresUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
    };
    const code = body.status === 'ok' ? 200 : 503;
    res.status(code).json(body);
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'poker-api',
      engine: getEngineInfo(),
    });
  });

  app.get('/rooms/:roomId/hands', async (req, res) => {
    const hands = await listHandHistory(req.params.roomId ?? '');
    res.json({ hands });
  });

  const server = http.createServer(app);
  attachWebSocket(server);

  const postgresUp = await checkPostgres();
  const redisUp = await checkRedis();

  if (postgresUp) {
    await hydrateRoomsFromSnapshots();
  }
  if (redisUp) {
    await roomPubSub.start();
  }

  console.log(
    JSON.stringify({
      msg: 'startup',
      engine: getEngineInfo().version,
      postgres: postgresUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      port: env.port,
    }),
  );

  if (!postgresUp) {
    console.warn('[api] Postgres not reachable at startup — /health will report degraded');
  }
  if (!redisUp) {
    console.warn('[api] Redis not reachable at startup — /health will report degraded');
  }

  server.listen(env.port, () => {
    console.log(`[api] listening on :${env.port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await roomPubSub.stop();
    redis.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[api] fatal', err);
  process.exit(1);
});
