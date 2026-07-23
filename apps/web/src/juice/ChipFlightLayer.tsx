import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { totalFlightMs, type ChipToken } from './chipFlight';

/** How long one chip spends in the air. */
export const CHIP_TRAVEL_MS = 620;

export type Point = { x: number; y: number };

export type ChipFlight = {
  id: string;
  from: Point;
  to: Point;
  tokens: ChipToken[];
  /** Fired as each chip lands, in order. */
  onChipLand?: (index: number, token: ChipToken) => void;
  /** Fired once, after the last chip. */
  onDone?: () => void;
};

/**
 * Chips in the air, drawn over everything in a portal so no felt zone has to
 * grow scrollbars for them.
 *
 * The land callbacks run off timers rather than animation events: the amounts
 * they credit must add up even if a tab is throttled or a frame is dropped.
 */
export function ChipFlightLayer({
  flights,
  onFlightEnd,
}: {
  flights: readonly ChipFlight[];
  onFlightEnd: (id: string) => void;
}) {
  if (typeof document === 'undefined' || flights.length === 0) return null;
  return createPortal(
    <>
      {flights.map((flight) => (
        <ChipFlightRun key={flight.id} flight={flight} onEnd={onFlightEnd} />
      ))}
    </>,
    document.body,
  );
}

function ChipFlightRun({
  flight,
  onEnd,
}: {
  flight: ChipFlight;
  onEnd: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const latest = useRef(flight);
  useEffect(() => {
    latest.current = flight;
  });

  useEffect(() => {
    const { id, tokens } = latest.current;
    if (reduce) {
      tokens.forEach((token, i) => latest.current.onChipLand?.(i, token));
      latest.current.onDone?.();
      onEnd(id);
      return;
    }

    const timers = tokens.map((token, i) =>
      window.setTimeout(
        () => latest.current.onChipLand?.(i, token),
        token.delayMs + CHIP_TRAVEL_MS,
      ),
    );
    const end = window.setTimeout(() => {
      latest.current.onDone?.();
      onEnd(id);
    }, totalFlightMs(tokens, CHIP_TRAVEL_MS) + 40);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(end);
    };
    // One run per flight: `flight` is read through the ref so a re-render with
    // a new callback identity never restarts the chips mid-air.
  }, [flight.id, reduce, onEnd]);

  if (reduce) return null;

  const { from, to, tokens } = flight;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <>
      {tokens.map((token, i) => (
        <motion.span
          key={`${flight.id}-${i}`}
          className="chip-fly"
          style={{
            background: token.face,
            borderColor: token.rim,
            boxShadow: `0 3px 8px rgba(0,0,0,0.45), inset 0 0 0 2px ${token.edge}`,
          }}
          initial={{ x: from.x, y: from.y, rotate: 0, opacity: 0, scale: 0.7 }}
          animate={{
            // Arc: lift over the middle of the trip and drift sideways a
            // little, so twelve chips do not travel as one rigid line.
            x: [from.x, midX + token.spread * 26, to.x],
            y: [from.y, midY - 38, to.y],
            rotate: token.spin,
            opacity: [0, 1, 1],
            scale: [0.7, 1, 0.86],
          }}
          transition={{
            delay: token.delayMs / 1000,
            duration: CHIP_TRAVEL_MS / 1000,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.5, 1],
          }}
        />
      ))}
    </>
  );
}

/** Centre of an element in viewport coordinates. */
export function centerOf(el: Element | null | undefined): Point | null {
  if (!el) return null;
  const box = el.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Queue of chip flights plus the portal that draws them. One instance owns all
 * the chips in the air for a screen.
 */
export function useChipFlights() {
  const [flights, setFlights] = useState<ChipFlight[]>([]);
  const nextId = useRef(0);

  const launch = useCallback((flight: Omit<ChipFlight, 'id'>): string | null => {
    if (flight.tokens.length === 0) return null;
    const id = `flight-${nextId.current++}`;
    setFlights((prev) => [...prev, { ...flight, id }]);
    return id;
  }, []);

  const onFlightEnd = useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setFlights([]), []);

  const layer = <ChipFlightLayer flights={flights} onFlightEnd={onFlightEnd} />;

  return { launch, clear, layer, inFlight: flights.length };
}
