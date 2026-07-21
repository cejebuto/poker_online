import type { CSSProperties } from 'react';
import type { Card, CardSize } from '@poker/shared';
import { useCardTheme } from './ThemeRegistry';
import { CARD_PX } from './CardTheme';

export type PlayingCardProps = {
  card?: Card | null;
  /** Show back if no card or faceDown */
  faceDown?: boolean;
  size?: CardSize;
  /** CSS animation class: deal | flip | reveal */
  animate?: 'deal' | 'flip' | 'reveal' | 'none';
  className?: string;
  style?: CSSProperties;
};

/**
 * Single card entry point for the whole UI.
 * Always renders via the active CardTheme — never hardcodes assets.
 */
export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  animate = 'none',
  className = '',
  style,
}: PlayingCardProps) {
  const { theme } = useCardTheme();
  const { w, h } = CARD_PX[size];
  const showBack = faceDown || !card;
  const animClass =
    animate === 'none' ? '' : `card-anim-${animate}`;

  return (
    <div
      className={`playing-card size-${size} ${animClass} ${className}`.trim()}
      style={{ width: w, height: h, ...style }}
      data-theme={theme.id}
      data-face={showBack ? 'back' : 'front'}
    >
      <div className="playing-card-inner">
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
}: {
  cards: Card[];
  size?: CardSize;
  max?: number;
  /** Fill the row to `max` with face-down placeholders. Off once no more cards are coming. */
  pad?: boolean;
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
          animate={c ? 'reveal' : 'none'}
        />
      ))}
    </div>
  );
}
