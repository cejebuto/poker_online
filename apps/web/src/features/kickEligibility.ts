import type { PublicPlayer, PublicRoomState } from '@poker/shared';

/**
 * Can the viewer expel this player from the table right now?
 *
 * Mirrors the server guard in `kickPlayer`: only the host can kick, never
 * themselves, and never a connected player while a hand is live — an offline
 * player can always be removed so a dropped seat cannot freeze the table.
 */
export function canKickFromTable(
  state: PublicRoomState,
  viewerId: string,
  target: PublicPlayer,
): boolean {
  const viewerIsHost = state.hostPlayerId === viewerId;
  if (!viewerIsHost) return false;
  if (target.playerId === viewerId) return false;
  if (target.playerId === state.hostPlayerId) return false;
  const handInProgress = state.phase === 'IN_HAND';
  return !handInProgress || !target.connected;
}
