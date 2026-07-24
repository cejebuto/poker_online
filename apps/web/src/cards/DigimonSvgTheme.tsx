import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * Digimon–inspired look (fan-made, no original assets).
 * What reads as Digimon: digivice orange + cyan, digital grid, bold angular
 * type, and attribute colours (Vaccine / Data / Virus / Free).
 */

const ATTR: Record<Suit, { main: string; glow: string }> = {
  hearts: { main: '#e63946', glow: '#ff8a94' }, // Virus
  diamonds: { main: '#e9c46a', glow: '#ffe8a3' }, // Data
  clubs: { main: '#2a9d8f', glow: '#7dede0' }, // Vaccine
  spades: { main: '#457b9d', glow: '#8ec5e8' }, // Free
};

const ORANGE = '#f4a261';
const ORANGE_DEEP = '#e76f51';
const CYAN = '#48cae4';
const NAVY = '#0d1b2a';
const FACE = '#f1faee';
const FONT = "ui-sans-serif, system-ui, 'Arial Black', 'Segoe UI', sans-serif";

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const attr = ATTR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 10 : size === 'md' ? 13 : 18;
  const centerFs = size === 'sm' ? 16 : size === 'md' ? 26 : 38;
  const pad = size === 'sm' ? 3.5 : 5;
  const rx = size === 'sm' ? 4 : 7;
  const pipY = centerPipY(h, { half });
  const uid = `digi-${card.rank}${card.suit[0]}-${size}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--digimon"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <defs>
        <pattern id={`${uid}-grid`} width={6} height={6} patternUnits="userSpaceOnUse">
          <path d="M6 0 L0 0 0 6" fill="none" stroke={CYAN} strokeWidth={0.4} opacity={0.25} />
        </pattern>
        <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ORANGE} />
          <stop offset="100%" stopColor={ORANGE_DEEP} />
        </linearGradient>
      </defs>

      {/* Digivice orange chassis. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={`url(#${uid}-frame)`} stroke={NAVY} strokeWidth={1.25} />
      <rect
        x={3}
        y={3}
        width={w - 6}
        height={h - 6}
        rx={Math.max(0, rx - 2)}
        fill={FACE}
        stroke={NAVY}
        strokeWidth={0.7}
      />
      <rect
        x={3}
        y={3}
        width={w - 6}
        height={h - 6}
        rx={Math.max(0, rx - 2)}
        fill={`url(#${uid}-grid)`}
      />

      {/* Attribute accent bar top. */}
      <rect x={3} y={3} width={w - 6} height={size === 'sm' ? 3 : 4} fill={attr.main} opacity={0.9} />

      <text x={pad} y={pad + cornerFs + 2} fill={attr.main} fontSize={cornerFs} fontFamily={FONT} fontWeight={900}>
        {rank}
      </text>
      <text x={pad} y={pad + cornerFs * 2.1 + 2} fill={NAVY} fontSize={cornerFs * 0.9} fontFamily={FONT} fontWeight={700}>
        {symbol}
      </text>

      {/* Digital target ring. */}
      <circle cx={w / 2} cy={pipY} r={centerFs * 0.75} fill="none" stroke={CYAN} strokeWidth={1.2} opacity={0.7} />
      <circle cx={w / 2} cy={pipY} r={centerFs * 0.55} fill={attr.main} opacity={0.12} />
      <text
        x={w / 2}
        y={pipY + centerFs * 0.35}
        textAnchor="middle"
        fill={attr.main}
        fontSize={centerFs}
        fontFamily={FONT}
        fontWeight={900}
      >
        {symbol}
      </text>

      <g transform={`translate(${w - pad}, ${h - pad}) rotate(180)`}>
        <text x={0} y={cornerFs} fill={attr.main} fontSize={cornerFs} fontFamily={FONT} fontWeight={900}>
          {rank}
        </text>
        <text x={0} y={cornerFs * 2.1} fill={NAVY} fontSize={cornerFs * 0.9} fontFamily={FONT} fontWeight={700}>
          {symbol}
        </text>
      </g>
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 4 : 7;
  const pipY = centerPipY(h, { half });
  const r = size === 'sm' ? 11 : size === 'md' ? 16 : 22;
  const uid = `digi-back-${size}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--digimon-back"
      role="img"
      aria-label="Card back"
    >
      <defs>
        <pattern id={`${uid}-grid`} width={5} height={5} patternUnits="userSpaceOnUse">
          <path d="M5 0 L0 0 0 5" fill="none" stroke={CYAN} strokeWidth={0.45} opacity={0.35} />
        </pattern>
        <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CYAN} />
          <stop offset="70%" stopColor={ORANGE_DEEP} />
          <stop offset="100%" stopColor={NAVY} />
        </radialGradient>
      </defs>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={NAVY} stroke={ORANGE} strokeWidth={1.5} />
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={Math.max(0, rx - 2)} fill={`url(#${uid}-grid)`} />
      {/* Digivice dial. */}
      <g transform={`translate(${w / 2}, ${pipY})`}>
        <circle r={r * 1.15} fill="none" stroke={ORANGE} strokeWidth={2} />
        <circle r={r * 0.9} fill={`url(#${uid}-core)`} stroke={CYAN} strokeWidth={1.25} />
        <circle r={r * 0.35} fill={FACE} stroke={NAVY} strokeWidth={1} />
        {/* Four attribute ticks. */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = Math.cos(rad) * r * 0.95;
          const y = Math.sin(rad) * r * 0.95;
          return <circle key={deg} cx={x} cy={y} r={1.6} fill={ORANGE} />;
        })}
      </g>
    </svg>
  );
}

export const digimonSvgTheme: CardTheme = {
  id: 'digimon',
  name: 'Digimon',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
