import type { RouletteClientEvent, RouletteServerEvent } from '@roulette/core';

/** Roulette's own socket — same reconnect shape as the poker client, but on the
 *  `/roulette` path and typed to roulette events. No poker code is imported. */

export type RouletteStatus = 'connecting' | 'connected' | 'disconnected';

export type RouletteHandlers = {
  onStatus: (status: RouletteStatus) => void;
  onEvent: (event: RouletteServerEvent) => void;
  onOpen?: () => void;
};

export type RouletteHandle = {
  send: (event: RouletteClientEvent) => void;
  close: () => void;
};

function resolveUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  // The roulette has its own server/port. In dev connect directly; behind a
  // proxy in production, route the same-origin `/roulette` path to that server.
  if (import.meta.env.DEV) {
    const port = (import.meta.env.VITE_ROULETTE_PORT as string | undefined) ?? '3002';
    return `${proto}://${host}:${port}`;
  }
  return `${proto}://${window.location.host}/roulette`;
}

export function connectRoulette(handlers: RouletteHandlers): RouletteHandle {
  let socket: WebSocket | null = null;
  let closedByUser = false;
  let retryMs = 500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue: RouletteClientEvent[] = [];

  const flush = () => {
    while (socket?.readyState === WebSocket.OPEN && queue.length) {
      socket.send(JSON.stringify(queue.shift()));
    }
  };

  const connect = () => {
    handlers.onStatus('connecting');
    socket = new WebSocket(resolveUrl());

    socket.addEventListener('open', () => {
      retryMs = 500;
      handlers.onStatus('connected');
      handlers.onOpen?.();
      flush();
    });

    socket.addEventListener('message', (msg) => {
      try {
        handlers.onEvent(JSON.parse(String(msg.data)) as RouletteServerEvent);
      } catch {
        // ignore malformed frames
      }
    });

    socket.addEventListener('close', () => {
      if (closedByUser) return;
      handlers.onStatus('disconnected');
      timer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 8000);
    });

    socket.addEventListener('error', () => socket?.close());
  };

  connect();

  return {
    send: (event) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
      else queue.push(event);
    },
    close: () => {
      closedByUser = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
}
