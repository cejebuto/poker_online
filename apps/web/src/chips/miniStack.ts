/**
 * What a small pile of physical chips looks like for a given amount.
 *
 * Decorative on purpose: the exact number is always printed next to the pile,
 * so the pile only has to say "this is a big stack of the good colours". It
 * caps both how many denominations and how many chips per column it draws.
 */

import { breakIntoChips, CHIP_COLORS, type ChipDenom } from './denominations';

export type MiniColumn = {
  denom: ChipDenom;
  face: string;
  edge: string;
  rim: string;
  /** Chips actually drawn in this column. */
  discs: number;
  /** Chips of this denomination the column could not fit. */
  hidden: number;
};

export const MINI_MAX_COLUMNS = 4;
export const MINI_MAX_PER_COLUMN = 5;

export function planMiniStack(
  amount: number,
  opts: { maxColumns?: number; maxPerColumn?: number } = {},
): MiniColumn[] {
  const maxColumns = Math.max(1, opts.maxColumns ?? MINI_MAX_COLUMNS);
  const maxPerColumn = Math.max(1, opts.maxPerColumn ?? MINI_MAX_PER_COLUMN);

  // breakIntoChips is greedy from the largest denomination down, so slicing
  // keeps the chips worth showing.
  return breakIntoChips(amount)
    .slice(0, maxColumns)
    .map((col) => {
      const colors = CHIP_COLORS[col.denom];
      const discs = Math.min(col.count, maxPerColumn);
      return {
        denom: col.denom,
        face: colors.face,
        edge: colors.edge,
        rim: colors.rim,
        discs,
        hidden: col.count - discs,
      };
    });
}
