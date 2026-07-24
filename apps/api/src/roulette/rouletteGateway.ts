import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import type { RouletteClientEvent } from '@roulette/core';
import { rouletteHub } from './rouletteHub.js';
import { handleRouletteEvent } from './rouletteHandlers.js';
import { onDisconnect } from './rouletteService.js';

/**
 * The roulette runs on its own HTTP server / port — completely separate from the
 * poker `/ws`. Two `WebSocketServer`s with a `path` on one shared server don't
 * coexist (the first aborts mismatched upgrades with a 400), and more importantly
 * a dedicated server keeps the poker untouched and lets the roulette be lifted out
 * to run standalone anywhere.
 *
 * Dev connects to `ws://host:ROULETTE_PORT`; behind a proxy, route `/roulette` here.
 */
const ROULETTE_PORT = Number(process.env.ROULETTE_PORT) || 3002;

function parse(raw: string): RouletteClientEvent | null {
  try {
    const data = JSON.parse(raw) as RouletteClientEvent;
    if (!data || typeof data !== 'object' || !('type' in data)) return null;
    return data;
  } catch {
    return null;
  }
}

export function startRoulette(): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('roulette');
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    const id = randomBytes(8).toString('hex');
    const conn = rouletteHub.register(id, socket);

    socket.on('message', (buf) => {
      const event = parse(buf.toString());
      if (event) handleRouletteEvent(conn, event);
    });

    socket.on('close', () => {
      const playerId = conn.playerId;
      rouletteHub.unregister(id);
      onDisconnect(id, playerId);
    });
  });

  server.listen(ROULETTE_PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[roulette] listening on ${ROULETTE_PORT}`);
  });

  return server;
}
