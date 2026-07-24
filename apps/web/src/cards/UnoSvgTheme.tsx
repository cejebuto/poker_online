import type { Card, CardSize, Suit } from '@poker/shared';
import { SUIT_SYMBOL } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { centerPipY } from './cardBox';

/**
 * UNO–inspired look (fan-made, no original assets / logos).
 * What reads as UNO instantly: solid suit colours, white centre oval,
 * huge black rank, tiny corner ovals, black back with four colour wedges.
 */

const UNO_COLOR: Record<Suit, string> = {
  hearts: '#e4002b', // red
  diamonds: '#ffcd00', // yellow
  clubs: '#009b48', // green
  spades: '#0066b3', // blue
};

const BLACK = '#1a1a1a';
const WHITE = '#ffffff';
const FONT = "ui-sans-serif, system-ui, 'Arial Black', Impact, sans-serif";

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const color = UNO_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const rank = card.rank;
  const cornerFs = size === 'sm' ? 9 : size === 'md' ? 12 : 16;
  const centerFs = size === 'sm' ? 20 : size === 'md' ? 32 : 48;
  const pad = size === 'sm' ? 3 : 4.5;
  const rx = size === 'sm' ? 6 : 10;
  const pipY = centerPipY(h, { half });
  const ovalRx = w * 0.34;
  const ovalRy = h * 0.28;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--uno"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={color} stroke={BLACK} strokeWidth={1.25} />

      {/* Big centre oval — the UNO signature. */}
      <ellipse
        cx={w / 2}
        cy={pipY}
        rx={ovalRx}
        ry={ovalRy}
        fill={WHITE}
        stroke={BLACK}
        strokeWidth={1}
        transform={`rotate(-18 ${w / 2} ${pipY})`}
      />
      <text
        x={w / 2}
        y={pipY + centerFs * 0.38}
        textAnchor="middle"
        fill={BLACK}
        fontSize={centerFs}
        fontFamily={FONT}
        fontWeight={900}
      >
        {rank}
      </text>
      {/* Tiny suit under the number for poker readability. */}
      <text
        x={w / 2}
        y={pipY + centerFs * 0.72}
        textAnchor="middle"
        fill={color}
        fontSize={cornerFs * 0.85}
        fontFamily={FONT}
        fontWeight={700}
      >
        {symbol}
      </text>

      {/* Corner mini-ovals. */}
      <ellipse cx={pad + 6} cy={pad + 8} rx={7} ry={9} fill={WHITE} stroke={BLACK} strokeWidth={0.6} />
      <text
        x={pad + 6}
        y={pad + 8 + cornerFs * 0.35}
        textAnchor="middle"
        fill={BLACK}
        fontSize={cornerFs * 0.85}
        fontFamily={FONT}
        fontWeight={900}
      >
        {rank}
      </text>

      <g transform={`translate(${w - pad - 6}, ${h - pad - 8}) rotate(180)`}>
        <ellipse cx={0} cy={0} rx={7} ry={9} fill={WHITE} stroke={BLACK} strokeWidth={0.6} />
        <text
          x={0}
          y={cornerFs * 0.35}
          textAnchor="middle"
          fill={BLACK}
          fontSize={cornerFs * 0.85}
          fontFamily={FONT}
          fontWeight={900}
        >
          {rank}
        </text>
      </g>
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 6 : 10;
  const pipY = centerPipY(h, { half });
  const ovalRx = w * 0.3;
  const ovalRy = h * 0.22;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--uno-back"
      role="img"
      aria-label="Card back"
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={BLACK} stroke="#333" strokeWidth={1} />
      {/* Four colour wedges in the corners. */}
      <path d={`M${rx} 1.5 Q 1.5 1.5 1.5 ${rx} L1.5 ${h / 2} L${w / 2} ${h / 2} L${w / 2} 1.5 Z`} fill="#e4002b" opacity={0.9} />
      <path d={`M${w - rx} 1.5 Q ${w - 1.5} 1.5 ${w - 1.5} ${rx} L${w - 1.5} ${h / 2} L${w / 2} ${h / 2} L${w / 2} 1.5 Z`} fill="#ffcd00" opacity={0.9} />
      <path d={`M1.5 ${h - rx} Q 1.5 ${h - 1.5} ${rx} ${h - 1.5} L${w / 2} ${h - 1.5} L${w / 2} ${h / 2} L1.5 ${h / 2} Z`} fill="#009b48" opacity={0.9} />
      <path
        d={`M${w - 1.5} ${h - rx} Q ${w - 1.5} ${h - 1.5} ${w - rx} ${h - 1.5} L${w / 2} ${h - 1.5} L${w / 2} ${h / 2} L${w - 1.5} ${h / 2} Z`}
        fill="#0066b3"
        opacity={0.9}
      />
      {/* Centre badge. */}
      <ellipse
        cx={w / 2}
        cy={pipY}
        rx={ovalRx}
        ry={ovalRy}
        fill={WHITE}
        stroke={BLACK}
        strokeWidth={1.25}
        transform={`rotate(-18 ${w / 2} ${pipY})`}
      />
      <text
        x={w / 2}
        y={pipY + (size === 'sm' ? 4 : 6)}
        textAnchor="middle"
        fill={BLACK}
        fontSize={size === 'sm' ? 11 : size === 'md' ? 15 : 20}
        fontFamily={FONT}
        fontWeight={900}
        letterSpacing={size === 'sm' ? 0 : 1}
      >
        ♠
      </text>
    </svg>
  );
}

export const unoSvgTheme: CardTheme = {
  id: 'uno',
  name: 'UNO',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
