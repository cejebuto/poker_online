import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * Yu-Gi-Oh!–inspired look (fan-made, no original assets / logos).
 * What reads as a duel card: gold filigree frame, type-coloured body
 * (Effect / Spell / Trap / Ritual), beige name plate, and a classic
 * amber-bordered back with a dark liquid-wave vortex.
 */

/** Suit → archetype colour (Effect / Spell / Trap / Ritual). */
const FRAME: Record<Suit, string> = {
  hearts: '#c45a11', // Effect Monster orange
  diamonds: '#157a40', // Spell green
  clubs: '#6b2d7a', // Trap purple
  spades: '#2a2460', // Ritual / dark blue-violet
};

const GOLD = '#d4af37';
const GOLD_DARK = '#8a7020';
const NAMEPLATE = '#e8dcc8';
const INK = '#1a1520';
const FONT = "ui-sans-serif, system-ui, 'Trebuchet MS', sans-serif";

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const body = FRAME[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 9 : size === 'md' ? 12 : 16;
  const centerFs = size === 'sm' ? 16 : size === 'md' ? 24 : 36;
  const pad = size === 'sm' ? 3 : 4;
  const rx = size === 'sm' ? 3 : 5;
  const pipY = centerPipY(h, { half });
  const nameH = size === 'sm' ? 11 : size === 'md' ? 14 : 18;
  const artTop = pad + nameH + 3;
  const artBottom = h - (size === 'sm' ? 12 : 16);
  const artH = Math.max(8, artBottom - artTop);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--yugioh"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      {/* Gold outer chrome. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={GOLD} stroke={GOLD_DARK} strokeWidth={1} />
      <rect
        x={2}
        y={2}
        width={w - 4}
        height={h - 4}
        rx={Math.max(0, rx - 1)}
        fill={body}
        stroke={GOLD}
        strokeWidth={0.75}
      />

      {/* Beige name plate with rank. */}
      <rect
        x={pad}
        y={pad}
        width={w - pad * 2}
        height={nameH}
        rx={1}
        fill={NAMEPLATE}
        stroke={INK}
        strokeWidth={0.5}
      />
      <text
        x={pad + 2}
        y={pad + nameH * 0.78}
        fill={INK}
        fontSize={cornerFs}
        fontFamily={FONT}
        fontWeight={800}
      >
        {rank} {symbol}
      </text>

      {/* Artwork window. */}
      <rect
        x={pad}
        y={artTop}
        width={w - pad * 2}
        height={artH}
        rx={1}
        fill="#f5f0e6"
        stroke={INK}
        strokeWidth={0.6}
      />
      <text
        x={w / 2}
        y={pipY + centerFs * 0.28}
        textAnchor="middle"
        fill={body}
        fontSize={centerFs}
        fontFamily={FONT}
        fontWeight={700}
      >
        {symbol}
      </text>

      {/* Bottom “stats” bar — rank as ATK/DEF echo. */}
      <rect
        x={pad}
        y={h - (size === 'sm' ? 11 : 14)}
        width={w - pad * 2}
        height={size === 'sm' ? 8 : 11}
        rx={1}
        fill={NAMEPLATE}
        stroke={INK}
        strokeWidth={0.45}
      />
      <text
        x={w - pad - 2}
        y={h - (size === 'sm' ? 4.5 : 5.5)}
        textAnchor="end"
        fill={INK}
        fontSize={size === 'sm' ? 7 : 9}
        fontFamily={FONT}
        fontWeight={700}
      >
        {rank}/{rank}
      </text>
    </svg>
  );
}

/** Closed path for a slightly lobed ellipse — reads as the classic wave ripples. */
function wavyRingPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lobes: number,
  amp: number,
  phase: number,
): string {
  const steps = 56;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // Dual-frequency wobble so rings feel liquid, not regular flower petals.
    const wobble = 1 + amp * Math.sin(lobes * t + phase) + amp * 0.35 * Math.sin((lobes + 2) * t - phase * 0.7);
    const x = cx + Math.cos(t) * rx * wobble;
    const y = cy + Math.sin(t) * ry * wobble;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${parts.join(' ')} Z`;
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 3 : 5;
  const cx = w / 2;
  const cy = centerPipY(h, { half });
  const uid = `ygob-${size}${half ? 'h' : ''}`;
  const border = size === 'sm' ? 3.5 : 5;
  const fieldW = w - border * 2;
  const fieldH = h - border * 2;
  // Max radius so outer ripples sit inside the amber frame.
  const maxRx = fieldW * 0.48;
  const maxRy = fieldH * 0.48;
  const ringCount = size === 'sm' ? 9 : size === 'md' ? 12 : 15;
  const voidR = size === 'sm' ? 7 : size === 'md' ? 11 : 16;

  // Concentric rings from outer (bright) toward the void (darker).
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const t = (i + 1) / (ringCount + 1);
    const scale = 1 - t * 0.82;
    const amp = 0.045 + (1 - t) * 0.04;
    const lobes = 5 + (i % 3);
    const phase = i * 0.55;
    // Warm gold → deep amber as we approach the void.
    const warm = Math.round(232 - t * 90);
    const mid = Math.round(150 - t * 70);
    const cool = Math.round(32 - t * 20);
    const stroke = `rgb(${warm},${mid},${Math.max(8, cool)})`;
    const strokeW = size === 'sm' ? 0.7 : size === 'md' ? 0.9 : 1.15;
    return {
      d: wavyRingPath(cx, cy, maxRx * scale, maxRy * scale, lobes, amp, phase),
      stroke,
      strokeW: strokeW * (0.75 + (1 - t) * 0.5),
      opacity: 0.55 + (1 - t) * 0.4,
    };
  });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--yugioh-back"
      role="img"
      aria-label="Card back"
    >
      <defs>
        <linearGradient id={`${uid}-border`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c896" />
          <stop offset="45%" stopColor="#c9a06a" />
          <stop offset="100%" stopColor="#a67c42" />
        </linearGradient>
        <radialGradient id={`${uid}-field`} cx="50%" cy="48%" r="62%">
          <stop offset="0%" stopColor="#1a0a06" />
          <stop offset="55%" stopColor="#0c0503" />
          <stop offset="100%" stopColor="#050201" />
        </radialGradient>
        <radialGradient id={`${uid}-void`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="70%" stopColor="#050201" />
          <stop offset="100%" stopColor="#1a0a06" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Amber outer chrome — classic duel-card border. */}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        rx={rx}
        fill={`url(#${uid}-border)`}
        stroke="#6b4a22"
        strokeWidth={0.75}
      />
      {/* Dark liquid field. */}
      <rect
        x={border}
        y={border}
        width={fieldW}
        height={fieldH}
        rx={Math.max(0, rx - 1)}
        fill={`url(#${uid}-field)`}
      />
      {/* Soft inner edge so the frame reads raised. */}
      <rect
        x={border + 0.4}
        y={border + 0.4}
        width={fieldW - 0.8}
        height={fieldH - 0.8}
        rx={Math.max(0, rx - 1.5)}
        fill="none"
        stroke="#3d2410"
        strokeWidth={0.6}
        opacity={0.7}
      />

      {/* Liquid-wave vortex (fan-made approximation of the classic back). */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {rings.map((ring, i) => (
          <path
            key={i}
            d={ring.d}
            stroke={ring.stroke}
            strokeWidth={ring.strokeW}
            opacity={ring.opacity}
          />
        ))}
      </g>

      {/* Central void. */}
      <ellipse cx={cx} cy={cy} rx={voidR * 1.15} ry={voidR * 1.05} fill={`url(#${uid}-void)`} />
      <ellipse cx={cx} cy={cy} rx={voidR * 0.72} ry={voidR * 0.66} fill="#000" />
    </svg>
  );
}

export const yugiohSvgTheme: CardTheme = {
  id: 'yugioh',
  name: 'Yu-Gi-Oh!',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
