import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * Slay the Spire–inspired look (fan-made, no original assets).
 * What reads as StS at a glance: aged parchment, iron/gold double frame,
 * class energy colors (Ironclad / Defect / Silent / Watcher), and a dark
 * relic-style back with an energy orb.
 */

const SUIT_COLOR: Record<Suit, string> = {
  hearts: '#c73e3a', // Ironclad red energy
  diamonds: '#3d9fd8', // Defect blue
  clubs: '#4a8f5c', // Silent green
  spades: '#7b4fb8', // Watcher purple
};

const PARCHMENT = '#e8dcc4';
const IRON = '#2a2433';
const GOLD = '#c9a84c';
const RELIC = '#1a1224';
const FONT = "ui-serif, Georgia, 'Times New Roman', serif";

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 10 : size === 'md' ? 13 : 18;
  const centerFs = size === 'sm' ? 16 : size === 'md' ? 26 : 38;
  const pad = size === 'sm' ? 3.5 : 5;
  const rx = size === 'sm' ? 4 : 7;
  const pipY = centerPipY(h, { half });
  const uid = `sts-${card.rank}${card.suit[0]}-${size}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--sts"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <defs>
        <radialGradient id={`${uid}-orb`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="70%" stopColor={color} stopOpacity={0.08} />
          <stop offset="100%" stopColor={PARCHMENT} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-parch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0e6d0" />
          <stop offset="100%" stopColor="#d9cbb0" />
        </linearGradient>
      </defs>

      {/* Iron outer + gold inner — the StS card chrome. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={IRON} stroke={GOLD} strokeWidth={1.25} />
      <rect
        x={2.5}
        y={2.5}
        width={w - 5}
        height={h - 5}
        rx={Math.max(0, rx - 2)}
        fill={`url(#${uid}-parch)`}
        stroke={GOLD}
        strokeWidth={0.75}
      />
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={Math.max(0, rx - 3)}
        fill="none"
        stroke={color}
        strokeWidth={0.6}
        opacity={0.45}
      />

      {/* Soft energy bloom behind the centre pip. */}
      <ellipse cx={w / 2} cy={pipY} rx={w * 0.32} ry={h * 0.22} fill={`url(#${uid}-orb)`} />

      <text x={pad} y={pad + cornerFs} fill={color} fontSize={cornerFs} fontFamily={FONT} fontWeight={700}>
        {rank}
      </text>
      <text x={pad} y={pad + cornerFs * 2} fill={color} fontSize={cornerFs * 0.9} fontFamily={FONT}>
        {symbol}
      </text>

      {/* Energy orb ring + pip. */}
      <circle
        cx={w / 2}
        cy={pipY}
        r={centerFs * 0.72}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.55}
      />
      <circle
        cx={w / 2}
        cy={pipY}
        r={centerFs * 0.55}
        fill={color}
        opacity={0.12}
      />
      <text
        x={w / 2}
        y={pipY + centerFs * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={centerFs}
        fontFamily={FONT}
        fontWeight={700}
      >
        {symbol}
      </text>

      <g transform={`translate(${w - pad}, ${h - pad}) rotate(180)`}>
        <text x={0} y={cornerFs} fill={color} fontSize={cornerFs} fontFamily={FONT} fontWeight={700}>
          {rank}
        </text>
        <text x={0} y={cornerFs * 2} fill={color} fontSize={cornerFs * 0.9} fontFamily={FONT}>
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
  const uid = `sts-back-${size}`;
  const r = size === 'sm' ? 10 : size === 'md' ? 14 : 20;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--sts-back"
      role="img"
      aria-label="Card back"
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#7b4fb8" stopOpacity={0.55} />
          <stop offset="55%" stopColor="#2a1838" stopOpacity={0.9} />
          <stop offset="100%" stopColor={RELIC} />
        </radialGradient>
      </defs>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={`url(#${uid}-glow)`} stroke={GOLD} strokeWidth={1.5} />
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={Math.max(0, rx - 2)}
        fill="none"
        stroke={GOLD}
        strokeWidth={0.9}
        opacity={0.7}
      />
      {/* Relic energy orb. */}
      <g transform={`translate(${w / 2}, ${pipY})`}>
        <circle r={r * 1.15} fill="none" stroke="#9b6fd4" strokeWidth={1.25} opacity={0.8} />
        <circle r={r * 0.85} fill="#3d2460" stroke={GOLD} strokeWidth={1} />
        <circle r={r * 0.45} fill="#c9a84c" opacity={0.85} />
        <circle r={r * 0.22} fill="#f0e6d0" />
      </g>
    </svg>
  );
}

export const slayTheSpireSvgTheme: CardTheme = {
  id: 'slay-the-spire',
  name: 'Slay the Spire',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
