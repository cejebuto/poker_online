import { WebSocket } from 'ws';
import type { RouletteServerEvent } from '@roulette/core';

/** One live socket, optionally bound to a roulette player id after `join`. */
export type RouletteConn = {
  id: string;
  socket: WebSocket;
  playerId: string | null;
};

/**
 * Connection registry + fan-out for the roulette channel. Deliberately its own
 * hub (no relation to the poker `ws/hub`), so the roulette can be lifted out.
 */
class RouletteHub {
  private conns = new Map<string, RouletteConn>();

  register(id: string, socket: WebSocket): RouletteConn {
    const conn: RouletteConn = { id, socket, playerId: null };
    this.conns.set(id, conn);
    return conn;
  }

  unregister(id: string): void {
    this.conns.delete(id);
  }

  bind(id: string, playerId: string): void {
    const c = this.conns.get(id);
    if (c) c.playerId = playerId;
  }

  send(connectionId: string, event: RouletteServerEvent): void {
    const c = this.conns.get(connectionId);
    if (c && c.socket.readyState === WebSocket.OPEN) c.socket.send(JSON.stringify(event));
  }

  sendToPlayer(playerId: string, event: RouletteServerEvent): void {
    const msg = JSON.stringify(event);
    for (const c of this.conns.values()) {
      if (c.playerId === playerId && c.socket.readyState === WebSocket.OPEN) c.socket.send(msg);
    }
  }

  broadcast(event: RouletteServerEvent): void {
    const msg = JSON.stringify(event);
    for (const c of this.conns.values()) {
      if (c.socket.readyState === WebSocket.OPEN) c.socket.send(msg);
    }
  }

  connectionCount(): number {
    return this.conns.size;
  }
}

export const rouletteHub = new RouletteHub();
