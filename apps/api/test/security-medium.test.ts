import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeDisplayName } from '@poker/shared';
import { rateLimit, _resetRateLimits } from '../src/domain/rateLimit.js';
import { createRoom, joinRoom } from '../src/domain/roomService.js';
import { toPublicRoomState, findPrivateLeaks } from '../src/domain/publicState.js';
import { roomRegistry } from '../src/domain/roomRegistry.js';
import { validateRoomPassword, hashPassword } from '../src/auth/password.js';

describe('security medium', () => {
  it('sanitizes display names', () => {
    assert.equal(sanitizeDisplayName('  <script>alert(1)</script>  '), 'scriptalert(1)script');
    assert.equal(sanitizeDisplayName('A'.repeat(100)).length, 24);
    assert.equal(sanitizeDisplayName(''), 'Player');
  });

  it('rate limit blocks bursts', () => {
    _resetRateLimits();
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimit('k', 5, 60_000).ok, true);
    }
    assert.equal(rateLimit('k', 5, 60_000).ok, false);
  });

  it('open room allows empty password on create and join', async () => {
    const host = await createRoom({
      password: '',
      user: { displayName: 'OpenHost' },
      connectionId: 'open1',
      config: { turnTimeoutMs: 0 },
    });
    const guest = await joinRoom({
      roomId: host.room.roomId,
      password: '',
      user: { displayName: 'OpenGuest' },
      connectionId: 'open2',
    });
    assert.equal(guest.room.roomId, host.room.roomId);
    await assert.rejects(
      () =>
        joinRoom({
          roomId: host.room.roomId,
          password: 'Wrongg',
          user: { displayName: 'Nope' },
          connectionId: 'open3',
        }),
      (e: Error & { code?: string }) => e.code === 'BAD_PASSWORD',
    );
  });

  it('password format + hash never in public state', async () => {
    assert.ok(validateRoomPassword('bad'));
    assert.equal(validateRoomPassword(''), null); // open room
    assert.equal(validateRoomPassword('Abcdef'), null);
    const hash = await hashPassword('Abcdef');
    assert.notEqual(hash, 'Abcdef');

    const host = await createRoom({
      password: 'Abcdef',
      user: { displayName: '<Bob>' },
      connectionId: 'sec1',
      config: { turnTimeoutMs: 0 },
    });
    assert.equal(host.player.displayName.includes('<'), false);

    const room = roomRegistry.get(host.room.roomId)!;
    const pub = toPublicRoomState(room, host.player.playerId);
    const raw = JSON.stringify(pub);
    assert.equal(raw.includes('passwordHash'), false);
    assert.equal(raw.includes('Abcdef'), false);
    assert.deepEqual(findPrivateLeaks(pub), []);

    await joinRoom({
      roomId: host.room.roomId,
      password: 'Abcdef',
      user: { displayName: 'Eve' },
      connectionId: 'sec2',
    });
  });
});
