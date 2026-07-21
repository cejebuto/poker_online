/** Chip face values used for tap-to-build bets and isometric stacks. */
export const CHIP_DENOMS = [1, 5, 25, 100, 500, 1000] as const;
export type ChipDenom = (typeof CHIP_DENOMS)[number];

export const CHIP_COLORS: Record<ChipDenom, { face: string; edge: string; rim: string }> = {
  1: { face: '#f8fafc', edge: '#94a3b8', rim: '#64748b' },
  5: { face: '#ef4444', edge: '#b91c1c', rim: '#fecaca' },
  25: { face: '#22c55e', edge: '#15803d', rim: '#bbf7d0' },
  100: { face: '#1e293b', edge: '#0f172a', rim: '#fbbf24' },
  500: { face: '#a855f7', edge: '#7e22ce', rim: '#e9d5ff' },
  1000: { face: '#f59e0b', edge: '#b45309', rim: '#fde68a' },
};

/** Max chips drawn as isometric stack before collapsing into multiplier bars. */
export const MAX_STACK_HEIGHT = 8;

export type ChipBarMultiplier = 100 | 1000 | 10000;

export type ChipBar = {
  multiplier: ChipBarMultiplier;
  /** 1–999 */
  count: number;
};

export type ChipColumn = {
  denom: ChipDenom;
  /** Visible chips in the isometric column (≤ MAX_STACK_HEIGHT). */
  count: number;
};

export type StackVisual = {
  columns: ChipColumn[];
  bars: ChipBar[];
  /** Chips not shown as columns/bars (should be 0 with full encoding). */
  remainder: number;
};

const BAR_MULTIPLIERS: ChipBarMultiplier[] = [10000, 1000, 100];

/**
 * Break an amount into standard chip denominations (greedy).
 */
export function breakIntoChips(amount: number): ChipColumn[] {
  let rest = Math.max(0, Math.floor(amount));
  const cols: ChipColumn[] = [];
  for (let i = CHIP_DENOMS.length - 1; i >= 0; i--) {
    const denom = CHIP_DENOMS[i]!;
    const count = Math.floor(rest / denom);
    if (count > 0) {
      cols.push({ denom, count });
      rest -= count * denom;
    }
  }
  return cols;
}

/**
 * Encode a large stack for display:
 * - Per denomination, keep up to MAX_STACK_HEIGHT isometric chips.
 * - Overflow + large totals use up to 3 bars (100× / 1.000× / 10.000×), count ≤ 999 each.
 */
export function encodeStackVisual(amount: number): StackVisual {
  const total = Math.max(0, Math.floor(amount));
  if (total === 0) return { columns: [], bars: [], remainder: 0 };

  const raw = breakIntoChips(total);
  const columns: ChipColumn[] = [];
  let overflow = 0;

  for (const col of raw) {
    if (col.count <= MAX_STACK_HEIGHT) {
      columns.push(col);
    } else {
      columns.push({ denom: col.denom, count: MAX_STACK_HEIGHT });
      overflow += (col.count - MAX_STACK_HEIGHT) * col.denom;
    }
  }

  // Also use bars when total is huge even if each column is short
  const columnValue = columns.reduce((s, c) => s + c.denom * c.count, 0);
  const toBars = overflow + Math.max(0, total - columnValue - overflow);

  // Prefer representing most of the value as bars when total exceeds threshold
  const BAR_THRESHOLD = MAX_STACK_HEIGHT * 1000;
  if (total > BAR_THRESHOLD) {
    // Re-encode entirely with bars + small residual columns
    return encodeWithBarsPreferred(total);
  }

  const bars = encodeBars(toBars);
  const barsValue = bars.reduce((s, b) => s + b.multiplier * b.count, 0);
  const remainder = Math.max(0, toBars - barsValue);

  return { columns, bars, remainder };
}

function encodeWithBarsPreferred(total: number): StackVisual {
  const bars = encodeBars(total);
  const used = bars.reduce((s, b) => s + b.multiplier * b.count, 0);
  const rest = total - used;
  const columns = breakIntoChips(rest).map((c) => ({
    denom: c.denom,
    count: Math.min(c.count, MAX_STACK_HEIGHT),
  }));
  const colVal = columns.reduce((s, c) => s + c.denom * c.count, 0);
  return { columns, bars, remainder: Math.max(0, rest - colVal) };
}

/** Up to 3 bars, largest multiplier first, each count capped at 999. */
export function encodeBars(amount: number): ChipBar[] {
  let rest = Math.max(0, Math.floor(amount));
  const bars: ChipBar[] = [];
  for (const mult of BAR_MULTIPLIERS) {
    if (rest < mult) continue;
    let count = Math.floor(rest / mult);
    if (count > 999) count = 999;
    if (count > 0) {
      bars.push({ multiplier: mult, count });
      rest -= count * mult;
    }
    if (bars.length >= 3) break;
  }
  return bars;
}

/** Value of bars. */
export function barsValue(bars: readonly ChipBar[]): number {
  return bars.reduce((s, b) => s + b.multiplier * b.count, 0);
}

/**
 * Clamp a proposed bet amount to legal No-Limit bounds.
 * @param amount desired total chips to put in this round (betThisRound target for raise/bet)
 * @param toCall chips needed to call
 * @param minRaise minimum raise size (increment)
 * @param currentBet highest bet this round
 * @param myBetThisRound already committed this round
 * @param stack remaining stack
 */
export function clampBetAmount(input: {
  amount: number;
  toCall: number;
  minRaise: number;
  currentBet: number;
  myBetThisRound: number;
  stack: number;
}): number {
  const maxTotal = input.myBetThisRound + input.stack; // all-in total this round
  let target = Math.floor(input.amount);
  if (target < 0) target = 0;
  if (target > maxTotal) target = maxTotal;

  // If not all-in and raising, enforce min raise total when exceeding call
  const callTotal = input.myBetThisRound + input.toCall;
  if (target > callTotal && target < maxTotal) {
    const minRaiseTo = input.currentBet + input.minRaise;
    if (target < minRaiseTo) target = Math.min(minRaiseTo, maxTotal);
  }

  // Must at least call if putting chips (unless all-in short)
  if (target > input.myBetThisRound && target < callTotal && target < maxTotal) {
    target = Math.min(callTotal, maxTotal);
  }

  return target;
}

export function formatMultiplier(m: ChipBarMultiplier): string {
  if (m === 10000) return '10.000×';
  if (m === 1000) return '1.000×';
  return '100×';
}
