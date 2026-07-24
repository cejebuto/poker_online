/** Local haptics for roulette — does not import poker juice. */
export function haptic(ms: number | number[] = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // iOS Safari often no-ops
  }
}

export const RltHaptic = {
  tick: () => haptic(8),
  step: () => haptic(10),
  confirm: () => haptic(16),
  heavy: () => haptic(22),
  error: () => haptic([12, 40, 12]),
  win: () => haptic([18, 30, 18, 30, 24]),
  lose: () => haptic([20, 40, 14]),
} as const;
