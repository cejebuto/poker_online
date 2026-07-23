import type { PublicPlayer, PublicRoomState } from '@poker/shared';

/**
 * Whether this player may top up / rebuy right now.
 *
 * Mirrors the server (`canRebuy` in api modes): only between hands, cash with
 * rebuy enabled, under the per-player cap. The UI also restricts to broke /
 * sitting-out seats so a full stack never offers a pointless rebuy.
 */
export function canPlayerRebuy(state: PublicRoomState, playerId: string): boolean {
  const me = state.players.find((p) => p.playerId === playerId);
  if (!me) return false;
  return canRebuyPlayer(me, {
    phase: state.phase,
    mode: state.config.mode,
    allowRebuy: state.config.allowRebuy,
    rebuyMax: state.config.rebuyMax,
  });
}

/** Pure helper for tests — same rules without needing a full room. */
export function canRebuyPlayer(
  me: Pick<PublicPlayer, 'stack' | 'status' | 'rebuyCount' | 'role'>,
  opts: {
    phase: PublicRoomState['phase'];
    mode: PublicRoomState['config']['mode'];
    allowRebuy?: boolean;
    rebuyMax?: number;
  },
): boolean {
  if (opts.phase === 'IN_HAND') return false;
  if (opts.mode === 'tournament') return false;
  // Cash defaults to rebuy on; only an explicit false disables it.
  if (opts.allowRebuy === false) return false;
  if (me.role === 'mesa') return false;
  if (me.status === 'ELIMINATED') return false;
  const max = opts.rebuyMax ?? 0;
  if (max <= 0) return false;
  if ((me.rebuyCount ?? 0) >= max) return false;
  return me.stack === 0 || me.status === 'SITTING_OUT';
}
