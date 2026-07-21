const TOKEN_KEY = 'poker.jwt';
const PLAYER_KEY = 'poker.playerId';
const ROOM_KEY = 'poker.roomId';

export function saveSession(token: string, playerId: string, roomId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, playerId);
  localStorage.setItem(ROOM_KEY, roomId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_KEY);
  localStorage.removeItem(ROOM_KEY);
}

export function loadSession(): { token: string; playerId: string; roomId: string } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const playerId = localStorage.getItem(PLAYER_KEY);
  const roomId = localStorage.getItem(ROOM_KEY);
  if (!token || !playerId || !roomId) return null;
  return { token, playerId, roomId };
}
