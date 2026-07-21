import type { PublicTournamentState } from '@poker/shared';
import {
  effectiveBlinds,
  nextLevelPreview,
  resolveBlindStructure,
} from './blinds.js';
import type { InternalRoom } from './types.js';

export function currentBlinds(room: InternalRoom): { smallBlind: number; bigBlind: number } {
  return effectiveBlinds(room.config, room.tournament.levelIndex);
}

/**
 * Advance tournament blind level by wall clock if duration elapsed.
 * Call before starting a hand.
 */
export function maybeAdvanceBlindLevel(room: InternalRoom): boolean {
  if (room.config.mode !== 'tournament' || room.tournament.finished) return false;
  const structure = resolveBlindStructure(room.config);
  const level = structure[room.tournament.levelIndex];
  if (!level) return false;
  const endsAt = room.tournament.levelStartedAt + level.durationMs;
  if (Date.now() < endsAt) return false;
  if (room.tournament.levelIndex >= structure.length - 1) return false;
  room.tournament.levelIndex += 1;
  room.tournament.levelStartedAt = Date.now();
  room.version += 1;
  return true;
}

export function buildPublicTournament(room: InternalRoom): PublicTournamentState | undefined {
  if (room.config.mode !== 'tournament') return undefined;
  const blinds = currentBlinds(room);
  const structure = resolveBlindStructure(room.config);
  const level = structure[room.tournament.levelIndex];
  const levelEndsAt =
    level && level.durationMs < Number.MAX_SAFE_INTEGER
      ? room.tournament.levelStartedAt + level.durationMs
      : null;
  const next = nextLevelPreview(room.config, room.tournament.levelIndex);
  const remaining = [...room.players.values()].filter(
    (p) => p.role !== 'mesa' && p.connectionStatus !== 'eliminated' && p.stack > 0,
  ).length;
  return {
    levelIndex: room.tournament.levelIndex,
    smallBlind: blinds.smallBlind,
    bigBlind: blinds.bigBlind,
    levelEndsAt,
    nextSmallBlind: next?.smallBlind ?? null,
    nextBigBlind: next?.bigBlind ?? null,
    playersRemaining: remaining,
    finished: room.tournament.finished,
    ranking: [...room.tournament.ranking],
  };
}

/**
 * After a hand completes: bust → sit-out (cash) or eliminate (tournament).
 */
export function applyPostHandModeRules(room: InternalRoom): {
  eliminations: string[];
  tournamentFinished: boolean;
} {
  const eliminations: string[] = [];

  // Count non-eliminated players before marking new eliminations
  const notEliminated = () =>
    [...room.players.values()].filter(
      (p) => p.role !== 'mesa' && p.connectionStatus !== 'eliminated',
    );

  for (const p of room.players.values()) {
    if (p.role === 'mesa') continue;
    if (p.connectionStatus === 'eliminated') continue;
    if (p.stack > 0) continue;

    if (room.config.mode === 'tournament') {
      const place = notEliminated().length; // current place among still-in (including this bust)
      p.connectionStatus = 'eliminated';
      p.finishPlace = place;
      p.seat = null;
      room.tournament.ranking.push({
        playerId: p.playerId,
        displayName: p.displayName,
        place,
      });
      eliminations.push(p.playerId);
    } else {
      p.connectionStatus = 'sitting_out';
    }
  }

  if (room.config.mode === 'tournament') {
    const remaining = notEliminated().filter((p) => p.stack > 0);
    if (remaining.length <= 1) {
      room.tournament.finished = true;
      room.phase = 'FINISHED';
      if (remaining[0] && remaining[0].finishPlace !== 1) {
        remaining[0].finishPlace = 1;
        // avoid duplicate place 1
        if (!room.tournament.ranking.some((r) => r.playerId === remaining[0]!.playerId)) {
          room.tournament.ranking.push({
            playerId: remaining[0].playerId,
            displayName: remaining[0].displayName,
            place: 1,
          });
        } else {
          const row = room.tournament.ranking.find((r) => r.playerId === remaining[0]!.playerId);
          if (row) row.place = 1;
        }
      }
      room.tournament.ranking.sort((a, b) => a.place - b.place);
      return { eliminations, tournamentFinished: true };
    }
  }

  return { eliminations, tournamentFinished: false };
}

export function canRebuy(
  room: InternalRoom,
  playerId: string,
): { ok: true } | { ok: false; code: string; message: string } {
  if (room.phase === 'IN_HAND') {
    return { ok: false, code: 'HAND_IN_PROGRESS', message: 'Rebuy only between hands' };
  }
  if (room.config.mode === 'tournament' || room.config.allowRebuy === false) {
    return { ok: false, code: 'REBUY_DISABLED', message: 'Rebuy not allowed in this room' };
  }
  const p = room.players.get(playerId);
  if (!p || p.role === 'mesa') {
    return { ok: false, code: 'FORBIDDEN', message: 'Not a player' };
  }
  const max = room.config.rebuyMax ?? 0;
  if (p.rebuyCount >= max) {
    return { ok: false, code: 'REBUY_MAX', message: `Max rebuys (${max}) reached` };
  }
  return { ok: true };
}

/** Add chips up to startingStack; increments rebuyCount. */
export function applyRebuy(
  room: InternalRoom,
  playerId: string,
  amount?: number,
): { stack: number; rebuyCount: number } {
  const check = canRebuy(room, playerId);
  if (!check.ok) {
    const e = new Error(check.message) as Error & { code: string };
    e.code = check.code;
    throw e;
  }
  const p = room.players.get(playerId)!;
  const add = Math.max(1, Math.floor(amount ?? room.config.startingStack));
  p.stack = Math.min(room.config.startingStack, p.stack + add);
  // From zero, give full starting stack by default
  if (p.stack < room.config.startingStack && (amount === undefined || amount >= room.config.startingStack)) {
    p.stack = room.config.startingStack;
  }
  p.rebuyCount += 1;
  p.connectionStatus = 'connected';
  if (p.seat === null) {
    for (let s = 0; s < room.config.maxPlayers; s++) {
      const taken = [...room.players.values()].some((x) => x.seat === s);
      if (!taken) {
        p.seat = s;
        break;
      }
    }
  }
  room.version += 1;
  return { stack: p.stack, rebuyCount: p.rebuyCount };
}
