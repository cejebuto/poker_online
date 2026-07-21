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
import { logger } from './observability/logger.js';
import { metricsSnapshot } from './observability/metrics.js';
import { roomRegistry } from './domain/roomRegistry.js';
import { hub } from './ws/hub.js';

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

  app.get('/metrics', (_req, res) => {
    res.json(
      metricsSnapshot(roomRegistry.all().filter((r) => r.phase !== 'CLOSED').length),
    );
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
    const n = await hydrateRoomsFromSnapshots();
    logger.info('hydrate complete', { rooms: n });
  }
  if (redisUp) {
    await roomPubSub.start();
  }

  logger.info('startup', {
    engine: getEngineInfo().version,
    postgres: postgresUp ? 'up' : 'down',
    redis: redisUp ? 'up' : 'down',
    port: env.port,
    webOrigin: env.webOrigin,
  });

  if (!postgresUp) {
    logger.warn('Postgres not reachable — health degraded');
  }
  if (!redisUp) {
    logger.warn('Redis not reachable — health degraded');
  }

  server.listen(env.port, () => {
    logger.info('listening', { port: env.port, connections: hub.dumpOpenConnectionCount() });
  });

  const shutdown = async (signal: string) => {
    logger.info('shutdown', { signal });
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
  logger.error('fatal', { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
