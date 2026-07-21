import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import type { WsServerEvent } from '@poker/shared';
import { hub } from '../ws/hub.js';

const ORIGIN = `pid-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Redis pub/sub so multiple api instances share broadcast fan-out.
 * Local hub is always updated; remote instances receive via Redis.
 */
class RoomPubSub {
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private ready = false;

  async start(): Promise<void> {
    try {
      this.pub = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      this.sub = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      await this.pub.connect();
      await this.sub.connect();
      await this.sub.subscribe('poker:room:broadcast');
      this.sub.on('message', (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as {
            roomId: string;
            event: WsServerEvent;
            origin: string;
          };
          if (parsed.origin === ORIGIN) return;
          hub.broadcast(parsed.roomId, parsed.event);
        } catch {
          // ignore
        }
      });
      this.ready = true;
      console.log(JSON.stringify({ msg: 'pubsub:ready' }));
    } catch (err) {
      console.warn('[pubsub] disabled', (err as Error).message);
      this.ready = false;
    }
  }

  /** Fan-out to local sockets + other instances. */
  async publish(roomId: string, event: WsServerEvent): Promise<void> {
    hub.broadcast(roomId, event);
    if (!this.ready || !this.pub) return;
    try {
      await this.pub.publish(
        'poker:room:broadcast',
        JSON.stringify({ roomId, event, origin: ORIGIN }),
      );
    } catch {
      // ignore
    }
  }

  async stop(): Promise<void> {
    try {
      await this.sub?.quit();
      await this.pub?.quit();
    } catch {
      // ignore
    }
  }
}

export const roomPubSub = new RoomPubSub();
