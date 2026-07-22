/** Pure gesture math for betting chrome zones — no DOM, no React. */

export const THROW_THRESHOLD_PX = 48;
export const SCRUB_STEP_PX = 24;
/** Max movement while arming long-press scrub (px). */
export const SCRUB_ARM_SLOP_PX = 8;
export const SCRUB_ARM_MS = 280;
/** Horizontal travel that flips the hole cards. Either direction flips. */
export const SWIPE_FLIP_PX = 40;

/** Hole-card flip: direction-agnostic, so left and right both turn the cards. */
export function isSwipeFlip(dx: number, thresholdPx = SWIPE_FLIP_PX): boolean {
  return Math.abs(dx) > thresholdPx;
}

/** Upward throw: positive dy = finger moved up. */
export function isThrowConfirm(dyUp: number, thresholdPx = THROW_THRESHOLD_PX): boolean {
  return dyUp > thresholdPx;
}

/** 0..1 progress toward throw threshold (for visual juice). */
export function throwProgress(dyUp: number, thresholdPx = THROW_THRESHOLD_PX): number {
  if (thresholdPx <= 0) return 0;
  return Math.min(1, Math.max(0, dyUp / thresholdPx));
}

export type ScrubStepResult = {
  /** Discrete step index from origin (can be negative). */
  steps: number;
  /** Delta steps since last reported index. */
  deltaSteps: number;
  nextLastStep: number;
};

/**
 * Map horizontal pointer delta to discrete scrub steps.
 * `lastStep` is the last index already applied (start at 0).
 */
export function scrubStepsFromDelta(
  dx: number,
  lastStep: number,
  stepPx = SCRUB_STEP_PX,
): ScrubStepResult {
  const safeStep = Math.max(1, stepPx);
  const steps = Math.trunc(dx / safeStep);
  const deltaSteps = steps - lastStep;
  return { steps, deltaSteps, nextLastStep: steps };
}

/** Amount after applying N scrub steps of `stepAmount` from a floor base. */
export function amountAfterScrubSteps(
  baseAmount: number,
  deltaSteps: number,
  stepAmount: number,
): number {
  if (deltaSteps === 0) return baseAmount;
  const step = Math.max(1, stepAmount);
  return baseAmount + deltaSteps * step;
}
