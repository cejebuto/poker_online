/**
 * Pure poker engine package.
 * No network, no DB, no framework dependencies.
 * Phase 1 will fill cards, evaluator, betting, pots, and hand state.
 */

export const ENGINE_VERSION = '0.1.0';

export type EngineInfo = {
  name: 'poker-engine';
  version: string;
};

export function getEngineInfo(): EngineInfo {
  return { name: 'poker-engine', version: ENGINE_VERSION };
}
