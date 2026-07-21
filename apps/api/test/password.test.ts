import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, validateRoomPassword, verifyPassword } from '../src/auth/password.js';

describe('room password', () => {
  it('accepts exactly 6 letters', () => {
    assert.equal(validateRoomPassword('AbCdEf'), null);
    assert.equal(validateRoomPassword('abcdef'), null);
  });

  it('rejects wrong length or non-letters', () => {
    assert.ok(validateRoomPassword('abc'));
    assert.ok(validateRoomPassword('abcdefg'));
    assert.ok(validateRoomPassword('abcde1'));
    assert.ok(validateRoomPassword('abc de'));
  });

  it('hashes and verifies without storing plaintext', async () => {
    const hash = await hashPassword('Secret');
    assert.notEqual(hash, 'Secret');
    assert.equal(await verifyPassword('Secret', hash), true);
    assert.equal(await verifyPassword('Wrongg', hash), false);
  });
});
