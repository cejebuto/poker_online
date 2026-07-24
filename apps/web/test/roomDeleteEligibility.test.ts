import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ROOM_DELETE_ADMIN_NAME } from '@poker/shared';
import { canDeleteRoomFromDirectory } from '../src/features/roomDeleteEligibility.js';

describe('canDeleteRoomFromDirectory', () => {
  it('allows only OTUBEJEC on a one-player table', () => {
    assert.equal(
      canDeleteRoomFromDirectory(ROOM_DELETE_ADMIN_NAME, { players: 1 }),
      true,
    );
  });

  it('hides the control for any other display name', () => {
    assert.equal(canDeleteRoomFromDirectory('otubejec', { players: 1 }), false);
    assert.equal(canDeleteRoomFromDirectory('Cesar', { players: 1 }), false);
    assert.equal(canDeleteRoomFromDirectory('', { players: 1 }), false);
  });

  it('hides the control when the table is not solo', () => {
    assert.equal(
      canDeleteRoomFromDirectory(ROOM_DELETE_ADMIN_NAME, { players: 0 }),
      false,
    );
    assert.equal(
      canDeleteRoomFromDirectory(ROOM_DELETE_ADMIN_NAME, { players: 2 }),
      false,
    );
  });
});
