import type { BlindLevel, RoomConfig } from '@poker/shared';

/** Default tournament structure: doubles roughly every 5 minutes. */
export const DEFAULT_BLIND_STRUCTURE: BlindLevel[] = [
  { smallBlind: 5, bigBlind: 10, durationMs: 5 * 60_000 },
  { smallBlind: 10, bigBlind: 20, durationMs: 5 * 60_000 },
  { smallBlind: 15, bigBlind: 30, durationMs: 5 * 60_000 },
  { smallBlind: 25, bigBlind: 50, durationMs: 5 * 60_000 },
  { smallBlind: 50, bigBlind: 100, durationMs: 5 * 60_000 },
  { smallBlind: 75, bigBlind: 150, durationMs: 5 * 60_000 },
  { smallBlind: 100, bigBlind: 200, durationMs: 5 * 60_000 },
  { smallBlind: 200, bigBlind: 400, durationMs: 5 * 60_000 },
  { smallBlind: 300, bigBlind: 600, durationMs: 5 * 60_000 },
  { smallBlind: 500, bigBlind: 1000, durationMs: 5 * 60_000 },
];

export function resolveBlindStructure(config: RoomConfig): BlindLevel[] {
  if (config.blindStructure && config.blindStructure.length > 0) {
    return config.blindStructure;
  }
  if (config.mode === 'tournament') {
    // Seed first level from config if provided
    const base = DEFAULT_BLIND_STRUCTURE.map((l) => ({ ...l }));
    if (config.smallBlind > 0 && config.bigBlind > 0) {
      base[0] = {
        ...base[0]!,
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
      };
    }
    return base;
  }
  return [
    {
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      durationMs: Number.MAX_SAFE_INTEGER,
    },
  ];
}

/**
 * Effective blinds for the next hand.
 * doubleMinimum: min open is 2×BB → we surface BB as 2× configured BB for betting floor.
 */
export function effectiveBlinds(
  config: RoomConfig,
  levelIndex: number,
): { smallBlind: number; bigBlind: number } {
  const structure = resolveBlindStructure(config);
  const idx = Math.min(levelIndex, structure.length - 1);
  const level = structure[idx] ?? structure[0]!;
  let sb = level.smallBlind;
  let bb = level.bigBlind;
  if (config.doubleMinimum) {
    sb *= 2;
    bb *= 2;
  }
  return { smallBlind: sb, bigBlind: bb };
}

export function nextLevelPreview(
  config: RoomConfig,
  levelIndex: number,
): { smallBlind: number; bigBlind: number } | null {
  const structure = resolveBlindStructure(config);
  const next = levelIndex + 1;
  if (next >= structure.length) return null;
  return effectiveBlinds(config, next);
}
