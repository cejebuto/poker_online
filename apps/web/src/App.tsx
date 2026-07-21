import { useEffect, useState } from 'react';
import type { WsServerEvent } from '@poker/shared';
import { connectWs, type ConnectionStatus } from './net/wsClient';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'conectando…',
  connected: 'conectado',
  disconnected: 'desconectado',
};

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastPong, setLastPong] = useState<string>('');

  useEffect(() => {
    return connectWs({
      onStatus: setStatus,
      onEvent: (event: WsServerEvent) => {
        if (event.type === 'pong') {
          setLastPong(new Date(event.ts).toLocaleTimeString());
        }
      },
    });
  }, []);

  return (
    <main className="app">
      <h1>Poker con Amigos</h1>
      <p className="muted">Fase 0 — healthcheck del stack</p>
      <div className="status" role="status" aria-live="polite">
        <span className={`dot ${status}`} aria-hidden />
        <span>{STATUS_LABEL[status]}</span>
      </div>
      {lastPong ? <p className="meta">Último pong: {lastPong}</p> : null}
    </main>
  );
}
