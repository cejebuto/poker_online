import { randomBytes } from 'node:crypto';

export function newId(prefix = ''): string {
  const id = randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

/** Short room code: 6 uppercase letters (not the password). */
export function newRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += letters[bytes[i]! % letters.length];
  }
  return code;
}
