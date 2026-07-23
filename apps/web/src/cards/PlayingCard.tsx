import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, CardSize } from '@poker/shared';
import { useCardTheme } from './ThemeRegistry';
import { CARD_PX } from './CardTheme';
import { cardBox } from './cardBox';
import { REVEAL_STAGGER_MS, revealDelays } from './revealTiming';

export type PlayingCardProps = {
  card?: Card | null;
  /** Show back if no card or faceDown */
  faceDown?: boolean;
  size?: CardSize;
  /** CSS animation class: deal | deal-deck | flip | reveal */
  animate?: 'deal' | 'deal-deck' | 'flip' | 'reveal' | 'none';
  /** Milliseconds to hold before the entry animation runs. */
  animateDelayMs?: number;
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
  animateDelayMs = 0,
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
      style={{
        width: box.w,
        height: box.h,
        ...(animateDelayMs > 0 ? { animationDelay: `${animateDelayMs}ms` } : null),
        ...style,
      }}
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
        {showBack
          ? theme.renderBack(size, { half: halfCards })
          : theme.renderFace(card!, size, { half: halfCards })}
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
  onReveal,
}: {
  cards: Card[];
  size?: CardSize;
  max?: number;
  /** Fill the row to `max` with face-down placeholders. Off once no more cards are coming. */
  pad?: boolean;
  halfScale?: number;
  /** Fires once per newly turned card, `delayMs` after the street lands. */
  onReveal?: (index: number, delayMs: number) => void;
}) {
  const length = pad ? max : Math.min(cards.length, max);
  const slots = Array.from({ length }, (_, i) => cards[i] ?? null);
  const shown = Math.min(cards.length, max);

  /*
   * Only the cards this street added get a delay — the turn must not re-flip
   * the flop. The count has to be adjusted during render (not in an effect):
   * the delay has to be on the very first render that shows the new card, or
   * the CSS animation has already started by the time it arrives.
   */
  const [seen, setSeen] = useState({ shown: 0, base: 0 });
  let base = seen.base;
  if (seen.shown !== shown) {
    base = Math.min(seen.shown, shown);
    setSeen({ shown, base });
  }
  const delays = revealDelays(base, shown);

  const revealRef = useRef(onReveal);
  useEffect(() => {
    revealRef.current = onReveal;
  });

  useEffect(() => {
    const timers: number[] = [];
    for (let i = base; i < shown; i++) {
      const delay = i - base === 0 ? 0 : (i - base) * REVEAL_STAGGER_MS;
      timers.push(window.setTimeout(() => revealRef.current?.(i, delay), delay));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [base, shown]);

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
          animateDelayMs={c ? (delays[i] ?? 0) : 0}
        />
      ))}
    </div>
  );
}
