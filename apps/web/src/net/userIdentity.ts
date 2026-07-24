/**
 * Local identity (pseudonym + avatar). Survives reload so presence:hello
 * and session:resume can re-register without forcing the gate again.
 */

const KEY = 'poker.user.v1';

export type StoredUser = { displayName: string; avatar: string };

export function loadUserIdentity(): StoredUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredUser>;
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const avatar = typeof parsed.avatar === 'string' ? parsed.avatar : '';
    if (displayName.length < 2) return null;
    return { displayName, avatar: avatar || '♠' };
  } catch {
    return null;
  }
}

export function saveUserIdentity(user: StoredUser): void {
  localStorage.setItem(KEY, JSON.stringify({
    displayName: user.displayName.trim(),
    avatar: user.avatar,
  }));
}

export function clearUserIdentity(): void {
  localStorage.removeItem(KEY);
}
