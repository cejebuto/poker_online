import type { WsClientEvent, WsServerEvent } from '@poker/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type WsClientHandlers = {
  onStatus: (status: ConnectionStatus) => void;
  onEvent?: (event: WsServerEvent) => void;
};

function resolveWsUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv) return fromEnv;

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  // In docker compose, web is served via nginx that proxies /ws to api.
  // Local vite dev hits the api port directly.
  if (import.meta.env.DEV) {
    const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) ?? '3001';
    return `${proto}://${host}:${apiPort}/ws`;
  }
  return `${proto}://${window.location.host}/ws`;
}

export function connectWs(handlers: WsClientHandlers): () => void {
  let socket: WebSocket | null = null;
  let closedByUser = false;
  let retryMs = 500;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    handlers.onStatus('connecting');
    socket = new WebSocket(resolveWsUrl());

    socket.addEventListener('open', () => {
      retryMs = 500;
      handlers.onStatus('connected');
      const ping: WsClientEvent = { type: 'ping', requestId: 'hello' };
      socket?.send(JSON.stringify(ping));
    });

    socket.addEventListener('message', (msg) => {
      try {
        const event = JSON.parse(String(msg.data)) as WsServerEvent;
        handlers.onEvent?.(event);
      } catch {
        // ignore malformed
      }
    });

    socket.addEventListener('close', () => {
      handlers.onStatus('disconnected');
      if (!closedByUser) {
        timer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 8000);
      }
    });

    socket.addEventListener('error', () => {
      socket?.close();
    });
  };

  connect();

  return () => {
    closedByUser = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
}
