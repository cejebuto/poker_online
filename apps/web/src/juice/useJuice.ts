import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSound } from 'use-sound';
import { type HapticKind, playHaptic } from './haptic';
import { loadSfxMuted, saveSfxMuted } from './soundPrefs';

export type JuiceKind = 'tick' | 'step' | 'confirm' | 'error' | 'throw';

const HAPTIC_FOR: Record<JuiceKind, HapticKind> = {
  tick: 'tick',
  step: 'step',
  confirm: 'confirm',
  error: 'error',
  throw: 'heavy',
};

/**
 * Coordinated juice: haptic + short SFX (samples in /public/sfx).
 * Muted state persists via soundPrefs; first play must stay on a user gesture.
 */
export function useJuice() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(loadSfxMuted());
  }, []);

  const soundEnabled = !muted;

  const [playTick] = useSound('/sfx/tick.wav', { soundEnabled, volume: 0.32 });
  const [playStep] = useSound('/sfx/step.wav', {
    soundEnabled,
    volume: 0.28,
    interrupt: true,
  });
  const [playConfirm] = useSound('/sfx/confirm.wav', { soundEnabled, volume: 0.45 });
  const [playError] = useSound('/sfx/error.wav', { soundEnabled, volume: 0.4 });
  const [playThrow] = useSound('/sfx/throw.wav', { soundEnabled, volume: 0.42 });

  const players = useMemo(
    () =>
      ({
        tick: playTick,
        step: playStep,
        confirm: playConfirm,
        error: playError,
        throw: playThrow,
      }) as const,
    [playTick, playStep, playConfirm, playError, playThrow],
  );

  const play = useCallback(
    (kind: JuiceKind) => {
      playHaptic(HAPTIC_FOR[kind]);
      if (muted) return;
      try {
        players[kind]();
      } catch {
        // Audio unlock / autoplay edge — fail silent
      }
    },
    [muted, players],
  );

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    saveSfxMuted(next);
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      saveSfxMuted(next);
      return next;
    });
  }, []);

  return { play, muted, setMuted, toggleMuted };
}
