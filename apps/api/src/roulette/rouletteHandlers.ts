import type { RouletteClientEvent } from '@roulette/core';
import type { RouletteConn } from './rouletteHub.js';
import { clearBets, join, placeBet, topUp } from './rouletteService.js';

function clip(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

/** Dispatch one client event. `conn.playerId` is set once the socket has joined. */
export function handleRouletteEvent(conn: RouletteConn, event: RouletteClientEvent): void {
  switch (event.type) {
    case 'join': {
      const id = clip(event.id, 64);
      if (!id) return;
      const name = clip(event.name, 24) || 'Jugador';
      const avatar = event.avatar ? clip(event.avatar, 16) : undefined;
      join(conn.id, id, name, avatar);
      return;
    }
    case 'bet':
      if (conn.playerId) placeBet(conn.playerId, clip(event.spot, 32), Number(event.amount));
      return;
    case 'clearBets':
      if (conn.playerId) clearBets(conn.playerId);
      return;
    case 'topUp':
      if (conn.playerId) topUp(conn.playerId);
      return;
  }
}
