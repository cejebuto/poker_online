import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { WebSocket } from 'ws';
import type { WsServerEvent } from '@poker/shared';
import { handleClientEvent, onDisconnect, sendPresence } from '../src/ws/handlers.js';
import { hub, type ClientSession } from '../src/ws/hub.js';
import { _resetRateLimits } from '../src/domain/rateLimit.js';

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
  });

  it('starts at 0 and only counts connections that sent presence:hello', async () => {
    const a = register('a');
    const b = register('b');
    sendPresence(a.session.connectionId);
    assert.deepEqual(presenceUpdates(a.sock), [0]);

    await handleClientEvent(a.session, { type: 'presence:hello', displayName: 'Ana' });
    assert.equal(hub.countPresent(), 1);
    // Both sockets hear the new total.
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
});
