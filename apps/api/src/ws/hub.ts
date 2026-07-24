import type { WebSocket } from 'ws';
import type { WsServerEvent } from '@poker/shared';

export type ClientSession = {
  connectionId: string;
  socket: WebSocket;
  playerId?: string;
  roomId?: string;
  role?: 'host' | 'player' | 'mesa';
  /** Set after `presence:hello` — counts as a registered app user. */
  displayName?: string;
};

class Hub {
  private connections = new Map<string, ClientSession>();

  register(connectionId: string, socket: WebSocket): ClientSession {
    const session: ClientSession = { connectionId, socket };
    this.connections.set(connectionId, session);
    return session;
  }

  get(connectionId: string): ClientSession | undefined {
    return this.connections.get(connectionId);
  }

  remove(connectionId: string): ClientSession | undefined {
    const s = this.connections.get(connectionId);
    this.connections.delete(connectionId);
    return s;
  }

  send(connectionId: string, event: WsServerEvent): void {
    const s = this.connections.get(connectionId);
    if (!s || s.socket.readyState !== s.socket.OPEN) return;
    s.socket.send(JSON.stringify(event));
  }

  sendToPlayer(roomId: string, playerId: string, event: WsServerEvent): void {
    for (const s of this.connections.values()) {
      if (s.roomId === roomId && s.playerId === playerId) {
        this.send(s.connectionId, event);
      }
    }
  }

  /** Broadcast to all connections in a room. Optional exclude connection. */
  broadcast(
    roomId: string,
    event: WsServerEvent,
    opts?: { excludeConnectionId?: string; onlyRoles?: Array<'host' | 'player' | 'mesa'> },
  ): void {
    for (const s of this.connections.values()) {
      if (s.roomId !== roomId) continue;
      if (opts?.excludeConnectionId && s.connectionId === opts.excludeConnectionId) continue;
      if (opts?.onlyRoles && s.role && !opts.onlyRoles.includes(s.role)) continue;
      this.send(s.connectionId, event);
    }
  }

  /** For each connection in room, build a personalized event (e.g. snapshot with yourCards). */
  broadcastMap(
    roomId: string,
    factory: (session: ClientSession) => WsServerEvent | null,
  ): void {
    for (const s of this.connections.values()) {
      if (s.roomId !== roomId) continue;
      const event = factory(s);
      if (event) this.send(s.connectionId, event);
    }
  }

  /** Connections that sent `presence:hello` (pseudonym chosen). */
  countPresent(): number {
    let n = 0;
    for (const s of this.connections.values()) {
      if (s.displayName) n += 1;
    }
    return n;
  }

  /** Fan-out to every open socket (lobby presence, etc.). */
  broadcastAll(event: WsServerEvent): void {
    for (const s of this.connections.values()) {
      this.send(s.connectionId, event);
    }
  }

  /** All events sent (for tests). */
  dumpOpenConnectionCount(): number {
    return this.connections.size;
  }

  /** Test helper — drop every connection. */
  _clearForTests(): void {
    this.connections.clear();
  }
}

export const hub = new Hub();
