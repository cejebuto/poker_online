import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRoom, joinRoom, kickPlayer } from '../src/domain/roomService.js';

let seq = 0;
async function tableWithGuest() {
  const tag = `kick${seq++}`;
  const host = await createRoom({
    password: '',
    user: { displayName: 'Host' },
    connectionId: `${tag}-h`,
    config: { turnTimeoutMs: 0 },
  });
  const guest = await joinRoom({
    roomId: host.room.roomId,
    password: '',
    user: { displayName: 'Guest' },
    connectionId: `${tag}-g`,
  });
  return { room: host.room, hostId: host.player.playerId, guestId: guest.player.playerId };
}

describe('kickPlayer', () => {
  it('host removes a player between hands', async () => {
    const { room, hostId, guestId } = await tableWithGuest();
    kickPlayer(room, hostId, guestId);
    assert.equal(room.players.has(guestId), false);
  });

  it('only the host can kick', async () => {
    const { room, hostId, guestId } = await tableWithGuest();
    assert.throws(
      () => kickPlayer(room, guestId, hostId),
      (e: Error & { code?: string }) => e.code === 'FORBIDDEN',
    );
  });

  it('will not kick a connected player during a live hand', async () => {
    const { room, hostId, guestId } = await tableWithGuest();
    room.phase = 'IN_HAND';
    assert.throws(
      () => kickPlayer(room, hostId, guestId),
      (e: Error & { code?: string }) => e.code === 'INVALID_PHASE',
    );
    assert.equal(room.players.has(guestId), true);
  });

  it('kicks an offline player even mid-hand so a dropped seat cannot freeze the table', async () => {
    const { room, hostId, guestId } = await tableWithGuest();
    room.phase = 'IN_HAND';
    room.players.get(guestId)!.connected = false;
    kickPlayer(room, hostId, guestId);
    assert.equal(room.players.has(guestId), false);
  });
});
