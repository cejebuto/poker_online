/** Client-only haptic juice. Silent no-op when unsupported (common on iOS Safari). */

export type HapticKind = 'tick' | 'step' | 'confirm' | 'error' | 'heavy';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 8,
  step: 6,
  confirm: 18,
  error: [12, 40, 12],
  heavy: 28,
};

export function haptic(ms: number | number[] = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore
  }
}

export function playHaptic(kind: HapticKind): void {
  haptic(PATTERNS[kind]);
}
