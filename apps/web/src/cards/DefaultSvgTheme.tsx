import type { Card, CardSize, Suit } from '@poker/shared';
import { isRedSuit, SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

const SUIT_COLOR: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#0f172a',
  spades: '#0f172a',
};

function FaceSvg({
  card,
  size,
  half = false,
}: {
  card: Card;
  size: CardSize;
  half?: boolean;
}) {
  const { w, h } = CARD_PX[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 10 : size === 'md' ? 13 : 18;
  const centerFs = size === 'sm' ? 18 : size === 'md' ? 28 : 42;
  const pad = size === 'sm' ? 3 : 5;
  const pipY = centerPipY(h, { half });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        rx={size === 'sm' ? 4 : 8}
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth={1}
      />
      <text
        x={pad}
        y={pad + cornerFs}
        fill={color}
        fontSize={cornerFs}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={700}
      >
        {rank}
      </text>
      <text
        x={pad}
        y={pad + cornerFs * 2}
        fill={color}
        fontSize={cornerFs * 0.9}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {symbol}
      </text>
      <text
        x={w / 2}
        y={pipY + centerFs * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={centerFs}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {symbol}
      </text>
      {/* bottom-right inverted */}
      <g transform={`translate(${w - pad}, ${h - pad}) rotate(180)`}>
        <text
          x={0}
          y={cornerFs}
          fill={color}
          fontSize={cornerFs}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight={700}
        >
          {rank}
        </text>
        <text
          x={0}
          y={cornerFs * 2}
          fill={color}
          fontSize={cornerFs * 0.9}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {symbol}
        </text>
      </g>
      {isRedSuit(card.suit) ? null : null}
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 4 : 8;
  const pipY = centerPipY(h, { half });
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back"
      role="img"
      aria-label="Card back"
    >
      <defs>
        <pattern id={`backpat-${size}`} width={8} height={8} patternUnits="userSpaceOnUse">
          <path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke="#312e81" strokeWidth={1} />
        </pattern>
      </defs>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill="#1e3a8a" stroke="#1e40af" />
      <rect x={4} y={4} width={w - 8} height={h - 8} rx={rx - 2} fill={`url(#backpat-${size})`} />
      <text
        x={w / 2}
        y={pipY + 6}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={size === 'sm' ? 14 : 22}
      >
        ♠
      </text>
    </svg>
  );
}

export const defaultSvgTheme: CardTheme = {
  id: 'default-svg',
  name: 'Default SVG',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
