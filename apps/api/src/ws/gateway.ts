import type { Server as HttpServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import type { WsClientEvent } from '@poker/shared';
import { hub } from './hub.js';
import { handleClientEvent, onDisconnect } from './handlers.js';

function parseClientEvent(raw: string): WsClientEvent | null {
  try {
    const data = JSON.parse(raw) as WsClientEvent;
    if (!data || typeof data !== 'object' || !('type' in data)) return null;
    return data;
  } catch {
    return null;
  }
}

export function attachWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    const connectionId = randomBytes(8).toString('hex');
    const session = hub.register(connectionId, socket);

    socket.on('message', (buf) => {
      const event = parseClientEvent(buf.toString());
      if (!event) {
        hub.send(connectionId, {
          type: 'error',
          code: 'INVALID_PAYLOAD',
          message: 'Invalid JSON event',
        });
        return;
      }
      void handleClientEvent(session, event);
    });

    socket.on('close', () => {
      onDisconnect(session);
    });
  });

  return wss;
}
