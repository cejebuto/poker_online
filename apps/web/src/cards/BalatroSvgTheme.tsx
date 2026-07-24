import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * Balatro-inspired card look (fan-made, no original assets): a warm CRT feel with
 * chunky retro digits, punchy split-tone suits and faint scanlines. Structure
 * mirrors DefaultSvgTheme so it honors `size` and the half-card crop the same way.
 */

// Balatro nudges the two reds and two blacks slightly apart instead of pure R/B.
const SUIT_COLOR: Record<Suit, string> = {
  hearts: '#e23b3b',
  diamonds: '#e8622e',
  clubs: '#2a3350',
  spades: '#1c2233',
};

const FACE_BG = '#f4ecd6';
const FACE_FRAME = '#c9b98a';
const CRT = '#3a2f22';
const PIXEL_FONT = "'Courier New', ui-monospace, 'SFMono-Regular', monospace";

function Scanlines({ w, h, rx, id }: { w: number; h: number; rx: number; id: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={4} height={2} fill={CRT} opacity={0.06} />
        </pattern>
      </defs>
      <rect
        x={1.5}
        y={1.5}
        width={w - 3}
        height={h - 3}
        rx={Math.max(0, rx - 1)}
        fill={`url(#${id})`}
        pointerEvents="none"
      />
    </>
  );
}

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 11 : size === 'md' ? 14 : 19;
  const centerFs = size === 'sm' ? 18 : size === 'md' ? 28 : 42;
  const pad = size === 'sm' ? 3.5 : 5;
  const rx = size === 'sm' ? 5 : 9;
  const pipY = centerPipY(h, { half });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--balatro"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      {/* Cream face with a warm frame, Balatro's signature bordered card. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={FACE_BG} stroke={CRT} strokeWidth={1.5} />
      <rect
        x={2.5}
        y={2.5}
        width={w - 5}
        height={h - 5}
        rx={Math.max(0, rx - 2)}
        fill="none"
        stroke={FACE_FRAME}
        strokeWidth={1}
      />

      {/* Top-left rank + suit, blocky retro digits. */}
      <text x={pad} y={pad + cornerFs} fill={color} fontSize={cornerFs} fontFamily={PIXEL_FONT} fontWeight={700}>
        {rank}
      </text>
      <text x={pad} y={pad + cornerFs * 2} fill={color} fontSize={cornerFs * 0.95} fontFamily={PIXEL_FONT}>
        {symbol}
      </text>

      {/* Center pip. */}
      <text
        x={w / 2}
        y={pipY + centerFs * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={centerFs}
        fontFamily={PIXEL_FONT}
        fontWeight={700}
      >
        {symbol}
      </text>

      {/* Bottom-right inverted. */}
      <g transform={`translate(${w - pad}, ${h - pad}) rotate(180)`}>
        <text x={0} y={cornerFs} fill={color} fontSize={cornerFs} fontFamily={PIXEL_FONT} fontWeight={700}>
          {rank}
        </text>
        <text x={0} y={cornerFs * 2} fill={color} fontSize={cornerFs * 0.95} fontFamily={PIXEL_FONT}>
          {symbol}
        </text>
      </g>

      <Scanlines w={w} h={h} rx={rx} id={`bal-scan-${size}`} />
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 5 : 9;
  const pipY = centerPipY(h, { half });
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--balatro-back"
      role="img"
      aria-label="Card back"
    >
      {/* Deep crimson with a bordered frame and a central emblem. */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill="#a41f2a" stroke="#2a0d10" strokeWidth={1.5} />
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={Math.max(0, rx - 2)}
        fill="none"
        stroke="#f2d27a"
        strokeWidth={1.5}
      />
      <g transform={`translate(${w / 2}, ${pipY})`}>
        <rect
          x={-w * 0.16}
          y={-w * 0.16}
          width={w * 0.32}
          height={w * 0.32}
          rx={2}
          transform="rotate(45)"
          fill="#7c1620"
          stroke="#f2d27a"
          strokeWidth={1.25}
        />
        <text
          x={0}
          y={size === 'sm' ? 5 : 7}
          textAnchor="middle"
          fill="#f2d27a"
          fontSize={size === 'sm' ? 14 : 22}
          fontFamily={PIXEL_FONT}
          fontWeight={700}
        >
          ♠
        </text>
      </g>
      <Scanlines w={w} h={h} rx={rx} id={`bal-back-scan-${size}`} />
    </svg>
  );
}

export const balatroSvgTheme: CardTheme = {
  id: 'balatro',
  name: 'Balatro',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
