/**
 * Card geometry, including "half card" mode.
 *
 * Reading a card only needs its top corner — that is how cards get fanned at a
 * real table. Clipping the bottom buys the room to draw the rest bigger, so the
 * card ends up wider and shorter than the full one.
 */

import type { CardSize } from '@poker/shared';
import { CARD_PX } from './CardTheme';

/**
 * How much of the card height stays visible. Slightly past the middle: cutting at
 * exactly 0.5 slices the centre pip in half and reads as a rendering glitch.
 */
export const HALF_VISIBLE_RATIO = 0.56;

/**
 * Where the big centre pip sits inside the *visible band* of a half card,
 * as a share of that band. Centring it on the card instead put the pip at 61%
 * of the height, past the 56% cut — it came out sliced in half.
 */
export const HALF_PIP_BAND_RATIO = 0.55;

export type CardBox = {
  w: number;
  h: number;
  /** Magnification for the artwork inside the (clipped) box. */
  innerScale: number;
};

export function cardBox(
  size: CardSize,
  opts?: { half?: boolean; scale?: number },
): CardBox {
  const { w, h } = CARD_PX[size];
  if (!opts?.half) return { w, h, innerScale: 1 };

  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  return {
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale * HALF_VISIBLE_RATIO)),
    innerScale: scale,
  };
}

/**
 * Vertical centre for a card's big suit symbol, in artwork coordinates.
 * Themes that draw their own face use it so the pip stays readable when the
 * bottom of the card is clipped away.
 */
export function centerPipY(h: number, opts?: { half?: boolean }): number {
  if (!opts?.half) return h / 2;
  return h * HALF_VISIBLE_RATIO * HALF_PIP_BAND_RATIO;
}
