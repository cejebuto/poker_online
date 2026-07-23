import type { Card, CardSize } from '@poker/shared';
import type { ReactElement } from 'react';

/** What a theme can return for a face or back. */
export type SvgOrElement = ReactElement;

/**
 * Hints about how the card will be shown. Optional on purpose: a theme that
 * ignores them (an image pack, for one) still satisfies the interface.
 */
export type CardRenderOptions = {
  /** Only the top band of the artwork will be visible — see cardBox. */
  half?: boolean;
};

/**
 * Pluggable card look. Game components never reference asset files directly —
 * they always go through CardTheme + ThemeRegistry.
 */
export interface CardTheme {
  id: string;
  name: string;
  /** Face of a playing card. */
  renderFace(card: Card, size: CardSize, opts?: CardRenderOptions): SvgOrElement;
  /** Card back. */
  renderBack(size: CardSize, opts?: CardRenderOptions): SvgOrElement;
}

export const CARD_PX: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 44, h: 62 },
  md: { w: 64, h: 90 },
  lg: { w: 96, h: 134 },
};
