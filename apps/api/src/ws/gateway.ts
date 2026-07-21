import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { WsClientEvent, WsServerEvent } from '@poker/shared';

function send(socket: WebSocket, event: WsServerEvent): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

function parseClientEvent(raw: string): WsClientEvent | null {
  try {
    const data = JSON.parse(raw) as WsClientEvent;
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function attachWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.on('message', (buf) => {
      const event = parseClientEvent(buf.toString());
      if (!event) {
        send(socket, { type: 'error', code: 'INVALID_PAYLOAD', message: 'Invalid JSON event' });
        return;
      }

      if (event.type === 'ping') {
        send(socket, { type: 'pong', requestId: event.requestId, ts: Date.now() });
        return;
      }

      // session:resume handled in later phases
      send(socket, {
        type: 'error',
        code: 'UNSUPPORTED',
        message: `Event not supported yet: ${event.type}`,
      });
    });
  });

  return wss;
}
