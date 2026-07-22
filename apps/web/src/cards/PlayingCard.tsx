import type { CSSProperties } from 'react';
import type { Card, CardSize } from '@poker/shared';
import { useCardTheme } from './ThemeRegistry';
import { CARD_PX } from './CardTheme';
import { cardBox } from './cardBox';

export type PlayingCardProps = {
  card?: Card | null;
  /** Show back if no card or faceDown */
  faceDown?: boolean;
  size?: CardSize;
  /** CSS animation class: deal | flip | reveal */
  animate?: 'deal' | 'flip' | 'reveal' | 'none';
  /**
   * Magnification for half-card mode. Ignored while the mode is off, so a screen
   * can declare how much room it has without ever growing a full card.
   */
  halfScale?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Single card entry point for the whole UI.
 * Always renders via the active CardTheme — never hardcodes assets.
 *
 * The animation classes stay on this outer node; half-card magnification is a
 * transform on the inner one, so `deal` / `reveal` / `flip` keep working.
 */
export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  animate = 'none',
  halfScale = 1,
  className = '',
  style,
}: PlayingCardProps) {
  const { theme, halfCards } = useCardTheme();
  const box = cardBox(size, { half: halfCards, scale: halfScale });
  const natural = CARD_PX[size];
  const showBack = faceDown || !card;
  const animClass =
    animate === 'none' ? '' : `card-anim-${animate}`;

  return (
    <div
      className={`playing-card size-${size} ${animClass} ${className}`.trim()}
      style={{ width: box.w, height: box.h, ...style }}
      data-theme={theme.id}
      data-face={showBack ? 'back' : 'front'}
      data-half={halfCards ? 'true' : undefined}
    >
      <div
        className="playing-card-inner"
        style={
          halfCards
            ? {
                width: natural.w,
                height: natural.h,
                transform: `scale(${box.innerScale})`,
                transformOrigin: 'top left',
              }
            : undefined
        }
      >
        {showBack ? theme.renderBack(size) : theme.renderFace(card!, size)}
      </div>
    </div>
  );
}

/** Row of community cards with reveal animation for newly shown ones. */
export function CommunityRow({
  cards,
  size = 'sm',
  max = 5,
  pad = true,
  halfScale = 1,
}: {
  cards: Card[];
  size?: CardSize;
  max?: number;
  /** Fill the row to `max` with face-down placeholders. Off once no more cards are coming. */
  pad?: boolean;
  halfScale?: number;
}) {
  const length = pad ? max : Math.min(cards.length, max);
  const slots = Array.from({ length }, (_, i) => cards[i] ?? null);
  return (
    <div className="community-row" role="group" aria-label="Community cards">
      {slots.map((c, i) => (
        <PlayingCard
          key={i}
          card={c}
          faceDown={!c}
          size={size}
          halfScale={halfScale}
          animate={c ? 'reveal' : 'none'}
        />
      ))}
    </div>
  );
}
