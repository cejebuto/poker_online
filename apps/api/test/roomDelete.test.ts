import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import { ROOM_DELETE_ADMIN_NAME } from '@poker/shared';
import {
  createRoom,
  joinRoom,
  forceDeleteSoloRoom,
  getServiceError,
} from '../src/domain/roomService.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { _clearAllTimersForTests } from '../src/domain/timerService.js';

let seq = 0;

async function soloRoom(displayName = 'host') {
  const tag = `del${(seq += 1)}`;
  const created = await createRoom({
    password: '',
    user: { displayName },
    connectionId: `${tag}-c0`,
    config: { name: `Mesa ${tag}`, turnTimeoutMs: 0 },
  });
  return roomRegistry.get(created.room.roomId)!;
}

describe('forceDeleteSoloRoom', () => {
  after(() => _clearAllTimersForTests());

  it('deletes a one-player room when the actor is the admin name', async () => {
    const room = await soloRoom();
    const roomId = room.roomId;
    const evicted = forceDeleteSoloRoom(room, ROOM_DELETE_ADMIN_NAME);
    assert.equal(evicted.length, 1);
    assert.equal(room.phase, 'CLOSED');
    assert.equal(room.players.size, 0);
    assert.equal(roomRegistry.get(roomId), undefined);
  });

  it('rejects anyone who is not exactly OTUBEJEC', async () => {
    const room = await soloRoom();
    assert.throws(
      () => forceDeleteSoloRoom(room, 'otubejec'),
      (err: unknown) => getServiceError(err).code === 'FORBIDDEN',
    );
    assert.throws(
      () => forceDeleteSoloRoom(room, 'OTUBEJEC '),
      (err: unknown) => getServiceError(err).code === 'FORBIDDEN',
    );
    assert.throws(
      () => forceDeleteSoloRoom(room, 'host'),
      (err: unknown) => getServiceError(err).code === 'FORBIDDEN',
    );
    assert.ok(roomRegistry.get(room.roomId), 'room stays registered');
    assert.notEqual(room.phase, 'CLOSED');
  });

  it('rejects when the table has more than one human player', async () => {
    const room = await soloRoom();
    await joinRoom({
      roomId: room.roomId,
      password: '',
      user: { displayName: 'p2' },
      connectionId: `del-join-${seq}`,
    });
    assert.throws(
      () => forceDeleteSoloRoom(room, ROOM_DELETE_ADMIN_NAME),
      (err: unknown) => getServiceError(err).code === 'INVALID_STATE',
    );
    assert.ok(roomRegistry.get(room.roomId));
  });

  it('allows a mesa device plus exactly one human', async () => {
    const room = await soloRoom();
    room.players.set('mesa-1', {
      ...[...room.players.values()][0]!,
      playerId: 'mesa-1',
      role: 'mesa',
      seat: null,
      displayName: 'Mesa',
    });
    const evicted = forceDeleteSoloRoom(room, ROOM_DELETE_ADMIN_NAME);
    assert.equal(evicted.length, 2, 'human + mesa both leave');
    assert.equal(roomRegistry.get(room.roomId), undefined);
  });

  it('rejects an empty table (no humans)', async () => {
    const room = await soloRoom();
    room.players.clear();
    assert.throws(
      () => forceDeleteSoloRoom(room, ROOM_DELETE_ADMIN_NAME),
      (err: unknown) => getServiceError(err).code === 'INVALID_STATE',
    );
  });
});
