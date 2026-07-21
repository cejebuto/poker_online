import bcrypt from 'bcryptjs';

const PASSWORD_RE = /^[A-Za-z]{6}$/;

export function validateRoomPassword(password: string): string | null {
  if (!PASSWORD_RE.test(password)) {
    return 'Password must be exactly 6 letters (A-Z, a-z only)';
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Ensure secrets never leak via JSON serialization helpers. */
export function assertNoPasswordLeak(payload: unknown): void {
  const raw = JSON.stringify(payload);
  if (/passwordHash|password(?!.)/i.test(raw) && /"password"\s*:/.test(raw)) {
    throw new Error('Password field leaked into client payload');
  }
  if (raw.includes('passwordHash')) {
    throw new Error('passwordHash leaked into client payload');
  }
}
