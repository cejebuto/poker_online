import { useEffect, useMemo, useRef, useState } from 'react';
import { POCKETS, POCKET_COUNT, pocketByIndex } from '@roulette/core';
import type { SpinTrigger } from './useRoulette';

const STEP = 360 / POCKET_COUNT;
const COLORS: Record<string, string> = { red: '#d8352a', black: '#14181f', green: '#128a4b' };

function point(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: 100 + r * Math.sin(a), y: 100 - r * Math.cos(a) };
}

/** Disc rotation (deg) that parks pocket `index` under the top pointer. */
function restingFor(index: number): number {
  return ((360 - index * STEP) % 360 + 360) % 360;
}

/**
 * The 3D-ish American wheel. Tilted with rotateX for the bowl look; the disc and
 * the ball are driven entirely by the server's `spin` result so every client
 * lands on the same pocket.
 */
export function RouletteWheel({
  spin,
  winningIndex,
}: {
  spin: SpinTrigger | null;
  winningIndex: number | null;
}) {
  const [disc, setDisc] = useState(() => (winningIndex != null ? restingFor(winningIndex) : 0));
  const [ball, setBall] = useState(0);
  const lastKey = useRef(0);

  useEffect(() => {
    if (!spin || spin.key === lastKey.current) return;
    lastKey.current = spin.key;
    const pocketDeg = spin.winningIndex * STEP;
    setDisc((prev) => {
      const mod = ((prev % 360) + 360) % 360;
      const targetMod = ((360 - pocketDeg) % 360 + 360) % 360;
      let delta = targetMod - mod;
      if (delta <= 0) delta += 360;
      return prev + 360 * 6 + delta; // several clockwise turns, land on the pocket
    });
    // Ball counter-spins and settles back at the top (over the winning pocket).
    setBall((prev) => prev - (360 * 10 + (((prev % 360) + 360) % 360)));
  }, [spin]);

  const face = useMemo(
    () => (
      <svg viewBox="0 0 200 200" className="rlt-disc-svg" aria-hidden>
        <circle cx="100" cy="100" r="100" fill="#07090d" />
        {POCKETS.map((p, i) => {
          const a0 = i * STEP - STEP / 2;
          const a1 = i * STEP + STEP / 2;
          const o0 = point(a0, 98);
          const o1 = point(a1, 98);
          const d = `M100 100 L${o0.x.toFixed(2)} ${o0.y.toFixed(2)} A98 98 0 0 1 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} Z`;
          const lp = point(i * STEP, 83);
          return (
            <g key={p.key}>
              <path d={d} fill={COLORS[p.color]} stroke="#caa94b" strokeWidth="0.35" />
              <text
                x={lp.x.toFixed(2)}
                y={lp.y.toFixed(2)}
                fill="#f4ecd6"
                fontSize="7.5"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${(i * STEP).toFixed(2)} ${lp.x.toFixed(2)} ${lp.y.toFixed(2)})`}
              >
                {p.label}
              </text>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="35" fill="#1a1206" stroke="#caa94b" strokeWidth="1.6" />
        <circle cx="100" cy="100" r="27" fill="#2a1e0b" stroke="#8a6d2a" strokeWidth="1" />
        <circle cx="100" cy="100" r="6" fill="#caa94b" />
      </svg>
    ),
    [],
  );

  const label = winningIndex != null ? pocketByIndex(winningIndex).label : '';

  return (
    <div className="rlt-wheel">
      <div className="rlt-wheel-pointer" aria-hidden />
      <div className="rlt-wheel-tilt">
        <div className="rlt-disc" style={{ transform: `rotate(${disc}deg)` }}>
          {face}
        </div>
        <div className="rlt-ball-orbit" style={{ transform: `rotate(${ball}deg)` }}>
          <span className="rlt-ball" />
        </div>
      </div>
      {label ? (
        <div className={`rlt-wheel-badge rlt-color-${pocketByIndex(winningIndex ?? 0).color}`}>
          {label}
        </div>
      ) : null}
    </div>
  );
}
