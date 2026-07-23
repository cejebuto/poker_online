import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isTurnDanger, turnClock, TURN_DANGER_RATIO } from './turnClock';

/**
 * Circular countdown drawn around a player's avatar — the table's clock lives
 * where the player is, not in a bar at the top of the screen.
 *
 * The ring is driven by a single CSS transition over the remaining time rather
 * than a per-frame React render: one style write when the turn starts, then
 * the compositor does the rest.
 */
export function CountdownRing({
  startedAt,
  timeoutMs,
  bankMs = 0,
  size = 34,
  stroke = 3,
  mine = false,
  children,
}: {
  startedAt?: number;
  timeoutMs?: number;
  bankMs?: number;
  size?: number;
  stroke?: number;
  /** My own clock reads green; everyone else's is neutral. */
  mine?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const circleRef = useRef<SVGCircleElement>(null);
  const [danger, setDanger] = useState(false);
  const [tick, setTick] = useState(0);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Reduced motion: step the ring once a second instead of gliding.
  useEffect(() => {
    if (!reduce || !startedAt || !timeoutMs) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [reduce, startedAt, timeoutMs]);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    const clock = turnClock({ now: Date.now(), startedAt, timeoutMs, bankMs });
    if (!clock) return;

    setDanger(isTurnDanger(clock));

    if (reduce) {
      circle.style.transition = 'none';
      circle.style.strokeDashoffset = String(circumference * clock.spent);
      return;
    }

    // Jump to where the clock actually is (a reconnect can land mid-turn),
    // then let one transition carry it to empty.
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = String(circumference * clock.spent);
    // Force a reflow so the browser does not collapse both writes into one.
    void circle.getBoundingClientRect();
    circle.style.transition = `stroke-dashoffset ${clock.remainingMs}ms linear`;
    circle.style.strokeDashoffset = String(circumference);

    const untilDanger = clock.remainingMs - clock.totalMs * TURN_DANGER_RATIO;
    const alarm = window.setTimeout(() => setDanger(true), Math.max(0, untilDanger));
    return () => window.clearTimeout(alarm);
  }, [startedAt, timeoutMs, bankMs, circumference, reduce, tick]);

  const active = Boolean(startedAt && timeoutMs && timeoutMs > 0);

  return (
    <span
      className={`countdown-ring${mine ? ' mine' : ''}${danger ? ' danger' : ''}`}
      style={{ width: size, height: size }}
    >
      {active ? (
        <svg className="countdown-ring-svg" width={size} height={size} aria-hidden>
          <circle
            className="countdown-ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            ref={circleRef}
            className="countdown-ring-arc"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />
        </svg>
      ) : null}
      <span className="countdown-ring-body">{children}</span>
    </span>
  );
}
