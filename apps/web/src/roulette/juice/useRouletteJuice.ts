import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSound } from 'use-sound';
import { RltHaptic } from './haptic';
import {
  getRouletteSfxMuted,
  setRouletteSfxMuted,
  subscribeRouletteSfxMuted,
} from './soundPrefs';
import { startSpinLoop, stopSpinLoop, unlockRouletteAudio } from './spinAudio';

export type RouletteJuiceKind =
  | 'chip-select'
  | 'bet-place'
  | 'clear'
  | 'error'
  | 'ball-drop'
  | 'win'
  | 'lose';

const HAPTIC: Record<RouletteJuiceKind, () => void> = {
  'chip-select': RltHaptic.tick,
  'bet-place': RltHaptic.step,
  clear: RltHaptic.tick,
  error: RltHaptic.error,
  'ball-drop': RltHaptic.confirm,
  win: RltHaptic.win,
  lose: RltHaptic.lose,
};

const BASE = '/sfx/roulette';

/**
 * Roulette-only juice. Never imports poker `useJuice` / chipAudio / poker mute.
 * Unlock audio on the first user gesture in the roulette screen.
 */
export function useRouletteJuice() {
  const muted = useSyncExternalStore(
    subscribeRouletteSfxMuted,
    getRouletteSfxMuted,
    () => false,
  );
  const soundEnabled = !muted;

  const [playChipSelect] = useSound(`${BASE}/chip-select.wav`, {
    soundEnabled,
    volume: 0.34,
  });
  const [playBetPlace] = useSound(`${BASE}/bet-place.wav`, {
    soundEnabled,
    volume: 0.45,
  });
  const [playClear] = useSound(`${BASE}/clear.wav`, { soundEnabled, volume: 0.4 });
  const [playError] = useSound(`${BASE}/error.wav`, { soundEnabled, volume: 0.4 });
  const [playBallDrop] = useSound(`${BASE}/ball-drop.wav`, {
    soundEnabled,
    volume: 0.48,
  });
  const [playWin] = useSound(`${BASE}/win.wav`, { soundEnabled, volume: 0.5 });
  const [playLose] = useSound(`${BASE}/lose.wav`, { soundEnabled, volume: 0.45 });

  const players = useMemo(
    () =>
      ({
        'chip-select': playChipSelect,
        'bet-place': playBetPlace,
        clear: playClear,
        error: playError,
        'ball-drop': playBallDrop,
        win: playWin,
        lose: playLose,
      }) as const,
    [playChipSelect, playBetPlace, playClear, playError, playBallDrop, playWin, playLose],
  );

  const unlock = useCallback(() => {
    unlockRouletteAudio();
  }, []);

  const play = useCallback(
    (kind: RouletteJuiceKind) => {
      HAPTIC[kind]();
      unlockRouletteAudio();
      if (muted) return;
      try {
        players[kind]();
      } catch {
        // autoplay edge
      }
    },
    [muted, players],
  );

  const startSpin = useCallback(
    (opts?: { durationMs?: number; onSettled?: () => void }) => {
      RltHaptic.heavy();
      unlockRouletteAudio();
      void startSpinLoop({
        muted,
        durationMs: opts?.durationMs,
        onSettled: () => {
          if (!muted) {
            try {
              playBallDrop();
            } catch {
              // ignore
            }
          }
          RltHaptic.confirm();
          opts?.onSettled?.();
        },
      });
    },
    [muted, playBallDrop],
  );

  const stopSpin = useCallback(() => {
    stopSpinLoop();
  }, []);

  const toggleMuted = useCallback(() => {
    setRouletteSfxMuted(!getRouletteSfxMuted());
  }, []);

  return {
    play,
    startSpin,
    stopSpin,
    unlock,
    muted,
    toggleMuted,
  };
}
