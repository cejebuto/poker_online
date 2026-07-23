import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSound } from 'use-sound';
import { playChipSound, unlockChipAudio, type ChipSoundKind } from './chipAudio';
import { type HapticKind, playHaptic } from './haptic';
import { getSfxMuted, setSfxMuted, subscribeSfxMuted } from './soundPrefs';

export type JuiceKind = 'tick' | 'step' | 'confirm' | 'error' | 'throw';

const HAPTIC_FOR: Record<JuiceKind, HapticKind> = {
  tick: 'tick',
  step: 'step',
  confirm: 'confirm',
  error: 'error',
  throw: 'heavy',
};

/** Chips and cards get a haptic only when they represent one of my own moves. */
const CHIP_HAPTIC: Partial<Record<ChipSoundKind, HapticKind>> = {
  place: 'step',
  sweep: 'confirm',
};

/**
 * Coordinated juice: haptic + short SFX.
 *
 * UI sounds are samples in /public/sfx; chips and cards are synthesised in
 * chipAudio so a line of them never sounds like the same file on repeat.
 * Mute lives in a shared store, so muting anywhere mutes everywhere at once.
 */
export function useJuice() {
  const muted = useSyncExternalStore(subscribeSfxMuted, getSfxMuted, () => false);
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
      // Every UI sound rides a tap, which is the only moment a browser lets us
      // start the audio graph the chips will need later.
      unlockChipAudio();
      if (muted) return;
      try {
        players[kind]();
      } catch {
        // Audio unlock / autoplay edge — fail silent
      }
    },
    [muted, players],
  );

  const playChip = useCallback(
    (kind: ChipSoundKind, opts?: { pitch?: number; gain?: number }) => {
      const feel = CHIP_HAPTIC[kind];
      if (feel) playHaptic(feel);
      playChipSound(kind, opts);
    },
    [],
  );

  const setMuted = useCallback((next: boolean) => {
    setSfxMuted(next);
  }, []);

  const toggleMuted = useCallback(() => {
    setSfxMuted(!getSfxMuted());
  }, []);

  return { play, playChip, muted, setMuted, toggleMuted };
}
