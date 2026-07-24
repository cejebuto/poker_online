import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * Inscryption–inspired look (fan-made, no original assets).
 * What reads as Inscryption: dirty parchment, black ink sketch, rough wood
 * frame, blood-red accents, and a single watching eye on the back.
 */

const SUIT_COLOR: Record<Suit, string> = {
  hearts: '#8b1a1a', // blood
  diamonds: '#3d2914', // bone/wood ink
  clubs: '#1a1208',
  spades: '#1a1208',
};

const PAPER = '#d4c5a9';
const WOOD = '#3d2914';
const INK = '#1a1208';
const BLOOD = '#6b1212';
const FONT = "ui-serif, Georgia, 'Times New Roman', serif";

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 10 : size === 'md' ? 13 : 18;
  const centerFs = size === 'sm' ? 18 : size === 'md' ? 28 : 42;
  const pad = size === 'sm' ? 4 : 6;
  const rx = size === 'sm' ? 3 : 5;
  const pipY = centerPipY(h, { half });
  const uid = `ins-${card.rank}${card.suit[0]}-${size}`;
  const isBlood = card.suit === 'hearts';

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--inscryption"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <defs>
        <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a3320" />
          <stop offset="50%" stopColor={WOOD} />
          <stop offset="100%" stopColor="#2a1a0e" />
        </linearGradient>
      </defs>

      {/* Thick wood frame — Leshy's cabin table energy. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={`url(#${uid}-wood)`} stroke={INK} strokeWidth={1.5} />
      <rect
        x={3.5}
        y={3.5}
        width={w - 7}
        height={h - 7}
        rx={Math.max(0, rx - 1)}
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.25}
      />
      {/* Ink-bleed inner line. */}
      <rect
        x={5.5}
        y={5.5}
        width={w - 11}
        height={h - 11}
        rx={Math.max(0, rx - 2)}
        fill="none"
        stroke={isBlood ? BLOOD : INK}
        strokeWidth={0.6}
        opacity={0.35}
        strokeDasharray="2 1.5"
      />

      {/* Slight paper stain. */}
      <ellipse cx={w * 0.7} cy={h * 0.75} rx={w * 0.18} ry={h * 0.1} fill={INK} opacity={0.04} />

      <text
        x={pad}
        y={pad + cornerFs}
        fill={color}
        fontSize={cornerFs}
        fontFamily={FONT}
        fontWeight={700}
        style={{ fontStyle: 'italic' }}
      >
        {rank}
      </text>
      <text x={pad} y={pad + cornerFs * 2.05} fill={color} fontSize={cornerFs * 0.95} fontFamily={FONT}>
        {symbol}
      </text>

      {/* Sketchy centre pip with a rough ring (sigil-ish). */}
      <ellipse
        cx={w / 2}
        cy={pipY}
        rx={centerFs * 0.7}
        ry={centerFs * 0.62}
        fill="none"
        stroke={color}
        strokeWidth={1.1}
        opacity={0.4}
        strokeDasharray="3 2"
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
        <text
          x={0}
          y={cornerFs}
          fill={color}
          fontSize={cornerFs}
          fontFamily={FONT}
          fontWeight={700}
          style={{ fontStyle: 'italic' }}
        >
          {rank}
        </text>
        <text x={0} y={cornerFs * 2.05} fill={color} fontSize={cornerFs * 0.95} fontFamily={FONT}>
          {symbol}
        </text>
      </g>
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 3 : 5;
  const pipY = centerPipY(h, { half });
  const eyeW = size === 'sm' ? 14 : size === 'md' ? 20 : 28;
  const eyeH = eyeW * 0.55;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--inscryption-back"
      role="img"
      aria-label="Card back"
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={WOOD} stroke={INK} strokeWidth={1.5} />
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={Math.max(0, rx - 1)}
        fill="#2a1a0e"
        stroke={BLOOD}
        strokeWidth={1}
        opacity={0.95}
      />
      {/* Watching eye — the table is looking back. */}
      <g transform={`translate(${w / 2}, ${pipY})`}>
        <ellipse rx={eyeW} ry={eyeH} fill={PAPER} stroke={INK} strokeWidth={1.25} />
        <ellipse rx={eyeW * 0.38} ry={eyeH * 0.7} fill={BLOOD} />
        <circle r={eyeH * 0.32} fill={INK} />
        <circle cx={-eyeH * 0.12} cy={-eyeH * 0.12} r={eyeH * 0.12} fill={PAPER} opacity={0.7} />
      </g>
      {/* Corner blood ticks. */}
      <path d={`M${6} ${h * 0.2} L${6} ${6} L${w * 0.22} ${6}`} fill="none" stroke={BLOOD} strokeWidth={1.5} opacity={0.7} />
      <path
        d={`M${w - 6} ${h * 0.8} L${w - 6} ${h - 6} L${w * 0.78} ${h - 6}`}
        fill="none"
        stroke={BLOOD}
        strokeWidth={1.5}
        opacity={0.7}
      />
    </svg>
  );
}

export const inscryptionSvgTheme: CardTheme = {
  id: 'inscryption',
  name: 'Inscryption',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
