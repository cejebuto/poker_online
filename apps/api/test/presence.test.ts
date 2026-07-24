import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { WebSocket } from 'ws';
import type { WsServerEvent } from '@poker/shared';
import {
  handleClientEvent,
  markPresent,
  onDisconnect,
  sendPresence,
} from '../src/ws/handlers.js';
import { hub, type ClientSession } from '../src/ws/hub.js';
import { _resetRateLimits } from '../src/domain/rateLimit.js';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';
import { signSession } from '../src/auth/jwt.js';

type FakeSocket = {
  /** hub.send compares readyState against socket.OPEN (ws API). */
  OPEN: 1;
  readyState: number;
  sent: WsServerEvent[];
  send: (raw: string) => void;
};

function openSocket(): FakeSocket {
  const sock: FakeSocket = {
    OPEN: 1,
    readyState: 1,
    sent: [],
    send(raw: string) {
      sock.sent.push(JSON.parse(raw) as WsServerEvent);
    },
  };
  return sock;
}

function register(id: string): { session: ClientSession; sock: FakeSocket } {
  const sock = openSocket();
  const session = hub.register(id, sock as unknown as WebSocket);
  return { session, sock };
}

function presenceUpdates(sock: FakeSocket): number[] {
  return sock.sent
    .filter((e): e is Extract<WsServerEvent, { type: 'presence:update' }> => e.type === 'presence:update')
    .map((e) => e.count);
}

describe('global presence (registered users)', () => {
  afterEach(() => {
    hub._clearForTests();
    _resetRateLimits();
    _clearAllTimersForTests();
  });

  it('starts at 0 and only counts connections that sent presence:hello', async () => {
    const a = register('a');
    const b = register('b');
    sendPresence(a.session.connectionId);
    assert.deepEqual(presenceUpdates(a.sock), [0]);

    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana' });
    assert.equal(hub.countPresent(), 1);
    assert.equal(presenceUpdates(a.sock).at(-1), 1);
    assert.equal(presenceUpdates(b.sock).at(-1), 1);

    await handleClientEvent(b.session, { type: 'presence:hello', displayName: 'Beto' });
    assert.equal(hub.countPresent(), 2);
    assert.equal(presenceUpdates(a.sock).at(-1), 2);
    assert.equal(presenceUpdates(b.sock).at(-1), 2);
  });

  it('does not double-count a re-hello from the same connection', async () => {
    const a = register('a');
    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana' });
    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana-2' });
    assert.equal(hub.countPresent(), 1);
    assert.equal(a.session.displayName, 'Ana-2');
  });

  it('rejects empty names', async () => {
    const a = register('a');
    await handleClientEvent(a.session, { type: 'presence:hello', displayName: '  ' });
    assert.equal(hub.countPresent(), 0);
    const err = a.sock.sent.find((e) => e.type === 'error');
    assert.ok(err && err.type === 'error');
    assert.equal(err.code, 'INVALID_USER');
  });

  it('decrements when a registered user disconnects', async () => {
    const a = register('a');
    const b = register('b');
    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana' });
    await handleClientEvent(b.session, { type: 'presence:hello', displayName: 'Beto' });
    assert.equal(hub.countPresent(), 2);

    onDisconnect(a.session);
    assert.equal(hub.countPresent(), 1);
    assert.equal(presenceUpdates(b.sock).at(-1), 1);
  });

  it('does not broadcast when an unregistered socket disconnects', async () => {
    const a = register('a');
    const b = register('b');
    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana' });
    b.sock.sent = [];
    onDisconnect(b.session);
    assert.equal(hub.countPresent(), 1);
    assert.equal(presenceUpdates(b.sock).length, 0);
    assert.equal(presenceUpdates(a.sock).at(-1), 1);
  });

  it('counts room:create without a prior hello', async () => {
    const host = register('host-create');
    await handleClientEvent(host.session, {
      type: 'room:create',
      password: 'Presxx',
      user: { displayName: 'Hosty' },
      config: { turnTimeoutMs: 0 },
    });
    assert.equal(hub.countPresent(), 1);
    assert.equal(host.session.displayName, 'Hosty');
  });

  it('counts room:join without a prior hello; mesa does not count', async () => {
    const host = register('host-join');
    await handleClientEvent(host.session, {
      type: 'room:create',
      password: 'Presyy',
      user: { displayName: 'Hosty' },
      config: { turnTimeoutMs: 0 },
    });
    const roomId = host.session.roomId!;
    const room = roomRegistry.get(roomId)!;

    const guest = register('guest-join');
    await handleClientEvent(guest.session, {
      type: 'room:join',
      roomId,
      password: 'Presyy',
      user: { displayName: 'Guest' },
    });
    assert.equal(hub.countPresent(), 2);

    const mesa = register('mesa-join');
    await handleClientEvent(mesa.session, {
      type: 'mesa:attach',
      roomId,
      password: 'Presyy',
    });
    assert.equal(hub.countPresent(), 2, 'mesa device must not inflate presence');
    assert.equal(mesa.session.displayName, undefined);
    assert.equal(room.players.size >= 2, true);
  });

  it('counts session:resume from room occupant displayName', async () => {
    const created = await createRoom({
      password: 'Preszz',
      user: { displayName: 'Resumer' },
      connectionId: 'seed-conn',
      config: { turnTimeoutMs: 0 },
    });
    // seed-conn is not a hub socket — only the resumed one should count.
    const token = signSession({
      playerId: created.player.playerId,
      roomId: created.room.roomId,
      role: 'host',
      seat: created.player.seat,
    });

    const a = register('resume-a');
    await handleClientEvent(a.session, { type: 'session:resume', token });
    assert.equal(hub.countPresent(), 1);
    assert.equal(a.session.displayName, 'Resumer');
  });

  it('markPresent rejects mesa label and short names', () => {
    const a = register('mark');
    assert.equal(markPresent(a.session, 'Mesa'), false);
    assert.equal(markPresent(a.session, 'x'), false);
    assert.equal(markPresent(a.session, 'OkName'), true);
    assert.equal(hub.countPresent(), 1);
  });
});
