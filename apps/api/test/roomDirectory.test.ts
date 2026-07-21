import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';
import { listActiveRooms } from '../src/domain/roomDirectory.js';

let seq = 0;

async function makeRoom(name: string, password = 'Dirxxx') {
  const tag = `dir${(seq += 1)}`;
  const created = await createRoom({
    password,
    user: { displayName: 'host' },
    connectionId: `${tag}-c1`,
    config: { name, turnTimeoutMs: 0 },
  });
  return roomRegistry.get(created.room.roomId)!;
}

function find(list: ReturnType<typeof listActiveRooms>, roomId: string) {
  return list.find((r) => r.roomId === roomId);
}

describe('active room directory', () => {
  after(() => _clearAllTimersForTests());

  it('lists a freshly created room with its name, code and seat count', async () => {
    const room = await makeRoom('Mesa de Cesar');
    const entry = find(listActiveRooms(), room.roomId);
    assert.ok(entry);
    assert.equal(entry.name, 'Mesa de Cesar');
    assert.equal(entry.code, room.code);
    assert.equal(entry.players, 1);
    assert.equal(entry.maxPlayers, room.config.maxPlayers);
    assert.equal(entry.phase, 'LOBBY');
  });

  it('never exposes the password or its hash', async () => {
    const room = await makeRoom('Secreta', 'Hunter');
    const entry = find(listActiveRooms(), room.roomId)!;
    const raw = JSON.stringify(entry);
    assert.equal(raw.includes('Hunter'), false);
    assert.equal(raw.toLowerCase().includes('password'), true, 'hasPassword flag is expected');
    assert.equal(raw.includes('passwordHash'), false);
    assert.equal(entry.hasPassword, true);
  });

  it('flags a room created without a password', async () => {
    const room = await makeRoom('Abierta', '');
    assert.equal(find(listActiveRooms(), room.roomId)!.hasPassword, false);
  });

  it('counts seated players but not the mesa device', async () => {
    const room = await makeRoom('Contando');
    await joinRoom({
      roomId: room.roomId,
      password: 'Dirxxx',
      user: { displayName: 'p2' },
      connectionId: 'dir-join-1',
    });
    assert.equal(find(listActiveRooms(), room.roomId)!.players, 2);
  });

  it('hides closed rooms', async () => {
    const room = await makeRoom('Cerrada');
    room.phase = 'CLOSED';
    assert.equal(find(listActiveRooms(), room.roomId), undefined);
  });

  it('keeps rooms that are mid-hand', async () => {
    const room = await makeRoom('Jugando');
    room.phase = 'IN_HAND';
    assert.equal(find(listActiveRooms(), room.roomId)!.phase, 'IN_HAND');
  });

  it('sorts by player count so the busiest tables surface first', async () => {
    const quiet = await makeRoom('Vacia');
    const busy = await makeRoom('Llena');
    await joinRoom({
      roomId: busy.roomId,
      password: 'Dirxxx',
      user: { displayName: 'x' },
      connectionId: 'dir-join-2',
    });
    const list = listActiveRooms();
    const iBusy = list.findIndex((r) => r.roomId === busy.roomId);
    const iQuiet = list.findIndex((r) => r.roomId === quiet.roomId);
    assert.ok(iBusy < iQuiet, 'busier room should come first');
  });
});
