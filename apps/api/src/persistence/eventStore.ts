import type { DomainEvent } from '@poker/engine';
import { prisma } from './prisma.js';
import type { InternalRoom } from '../domain/types.js';
import { serializeRoom } from '../domain/roomSerialize.js';

export async function appendDomainEvents(
  room: InternalRoom,
  events: DomainEvent[],
  handId?: string,
): Promise<void> {
  if (events.length === 0) {
    room.version += 1;
    return;
  }
  for (const ev of events) {
    room.version += 1;
    if (!process.env.DATABASE_URL) continue;
    try {
      await prisma.roomEvent.create({
        data: {
          roomId: room.roomId,
          handId: handId ?? room.hand?.handId ?? null,
          version: room.version,
          type: ev.type,
          payload: ev as object,
        },
      });
    } catch (err) {
      console.warn('[eventStore] append failed', (err as Error).message);
    }
  }
}

export async function appendRoomEvent(
  room: InternalRoom,
  type: string,
  payload: object,
  handId?: string,
): Promise<void> {
  room.version += 1;
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.roomEvent.create({
      data: {
        roomId: room.roomId,
        handId: handId ?? room.hand?.handId ?? null,
        version: room.version,
        type,
        payload,
      },
    });
  } catch (err) {
    console.warn('[eventStore] appendRoomEvent failed', (err as Error).message);
  }
}

export async function saveSnapshot(room: InternalRoom): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.roomSnapshot.create({
      data: {
        roomId: room.roomId,
        version: room.version,
        phase: room.phase,
        stateJson: serializeRoom(room) as object,
      },
    });
  } catch (err) {
    console.warn('[eventStore] snapshot failed', (err as Error).message);
  }
}

export async function saveHandHistory(room: InternalRoom): Promise<void> {
  if (!process.env.DATABASE_URL || !room.hand) return;
  const hand = room.hand;
  try {
    const winners = Object.entries(hand.payouts)
      .filter(([, a]) => a > 0)
      .map(([s]) => Number(s));
    await prisma.handHistory.upsert({
      where: {
        roomId_handId: { roomId: room.roomId, handId: hand.handId },
      },
      create: {
        roomId: room.roomId,
        handId: hand.handId,
        button: hand.button,
        community: hand.community as object[],
        payouts: hand.payouts as object,
        winners: winners as object,
        players: hand.players.map((p) => ({
          seat: p.seat,
          stack: p.stack,
          status: p.status,
          contribution: p.contribution,
        })) as object[],
      },
      update: {
        payouts: hand.payouts as object,
        winners: winners as object,
        community: hand.community as object[],
      },
    });
  } catch (err) {
    console.warn('[eventStore] hand history failed', (err as Error).message);
  }
}

export async function markProcessedAction(
  roomId: string,
  clientActionId: string,
  handId: string | undefined,
  result: unknown,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.processedAction.upsert({
      where: {
        roomId_clientActionId: { roomId, clientActionId },
      },
      create: {
        roomId,
        clientActionId,
        handId: handId ?? null,
        resultJson: (result ?? {}) as object,
      },
      update: {},
    });
  } catch (err) {
    console.warn('[eventStore] processedAction failed', (err as Error).message);
  }
}

export async function loadLatestSnapshots(): Promise<
  { roomId: string; version: number; stateJson: unknown }[]
> {
  if (!process.env.DATABASE_URL) return [];
  try {
    // Latest snapshot per room via distinct + order
    const rooms = await prisma.room.findMany({
      where: { phase: { not: 'CLOSED' } },
      select: { id: true },
    });
    const out: { roomId: string; version: number; stateJson: unknown }[] = [];
    for (const r of rooms) {
      const snap = await prisma.roomSnapshot.findFirst({
        where: { roomId: r.id },
        orderBy: { version: 'desc' },
      });
      if (snap) {
        out.push({
          roomId: r.id,
          version: snap.version,
          stateJson: snap.stateJson,
        });
      }
    }
    return out;
  } catch (err) {
    console.warn('[eventStore] load snapshots failed', (err as Error).message);
    return [];
  }
}

export async function listHandHistory(roomId: string, limit = 20) {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await prisma.handHistory.findMany({
      where: { roomId },
      orderBy: { closedAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}
