import type { Card, CardSize, Suit } from '@poker/shared';
import type { CardRenderOptions, CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { HALF_VISIBLE_RATIO, centerPipY } from './cardBox';

/**
 * Pokémon TCG–inspired look (fan-made, no original assets).
 * Spanish type labels, custom energy icons (not poker suits).
 */

const ENERGY: Record<Suit, { main: string; soft: string; label: string }> = {
  hearts: { main: '#ee6b2f', soft: '#ffd4b8', label: 'Fuego' },
  diamonds: { main: '#f7d02c', soft: '#fff3b0', label: 'Rayo' },
  clubs: { main: '#78c850', soft: '#d4f0c0', label: 'Planta' },
  spades: { main: '#6890f0', soft: '#c8d8ff', label: 'Agua' },
};

const BORDER = '#2a2a2a';
const FACE = '#faf8f2';
const FONT = "ui-sans-serif, system-ui, 'Segoe UI', sans-serif";

/**
 * Energy icons drawn in a 24×24 viewBox, scaled via transform.
 * Paths are simple geometric silhouettes — not franchise assets.
 */
function EnergyIcon({ suit, size, color }: { suit: Suit; size: number; color: string }) {
  const s = size / 24;
  // Flame
  if (suit === 'hearts') {
    return (
      <g transform={`scale(${s})`} fill={color}>
        <path d="M12 2 C10 7 6 9 6 14 C6 18.4 8.7 22 12 22 C15.3 22 18 18.4 18 14 C18 9 14 7 12 2 Z" />
        <path d="M12 12 C11 14 10 15 10 17 C10 18.7 10.9 20 12 20 C13.1 20 14 18.7 14 17 C14 15 13 14 12 12 Z" fill={FACE} opacity={0.85} />
      </g>
    );
  }
  // Lightning bolt
  if (suit === 'diamonds') {
    return (
      <g transform={`scale(${s})`} fill={color}>
        <path d="M13.5 1 L5 13.5 H11 L9.5 23 L19 10 H13 L13.5 1 Z" />
      </g>
    );
  }
  // Leaf
  if (suit === 'clubs') {
    return (
      <g transform={`scale(${s})`} fill={color}>
        <path d="M12 3 C7 7 4 12 5 17 C8 16 11 14 12 11 C13 14 16 16 19 17 C20 12 17 7 12 3 Z" />
        <path d="M12 11 L12 22" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </g>
    );
  }
  // Water drop
  return (
    <g transform={`scale(${s})`} fill={color}>
      <path d="M12 2 C12 2 5 11 5 16 C5 19.9 8.1 23 12 23 C15.9 23 19 19.9 19 16 C19 11 12 2 12 2 Z" />
      <ellipse cx={10} cy={15} rx={1.6} ry={2.2} fill={FACE} opacity={0.55} />
    </g>
  );
}

function FaceSvg({ card, size, half = false }: { card: Card; size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const energy = ENERGY[card.suit];
  const rank = card.rank;
  // Slightly larger rank than the other themes (Pokémon only).
  const cornerFs = size === 'sm' ? 13 : size === 'md' ? 17 : 23;
  const pad = size === 'sm' ? 3 : 4.5;
  const rx = size === 'sm' ? 4 : 8;
  const uid = `pkm-${card.rank}${card.suit[0]}-${size}${half ? 'h' : ''}`;
  const cornerIcon = size === 'sm' ? 9 : size === 'md' ? 12 : 16;
  const stripH = size === 'sm' ? 9 : 12;

  // Full face: big centre energy. Half face: centre must sit BELOW the rank
  // (and its corner icon) or it paints over the number — see half-card crop.
  const rankBottom = pad + cornerFs;
  const showCornerIcon = !half;
  const cornerStackBottom = showCornerIcon ? rankBottom + 2 + cornerIcon : rankBottom;
  const visibleBottom = half ? h * HALF_VISIBLE_RATIO : h - stripH - pad;
  const gap = size === 'sm' ? 2 : 3;
  const slotTop = cornerStackBottom + gap;
  const slotBottom = visibleBottom - gap;
  const slotH = Math.max(8, slotBottom - slotTop);
  const defaultCenter = size === 'sm' ? 22 : size === 'md' ? 34 : 48;
  const centerIcon = half ? Math.min(defaultCenter, Math.floor(slotH * 0.72)) : defaultCenter;
  const pipY = half ? slotTop + slotH / 2 : centerPipY(h, { half });
  const ellipseRx = half ? Math.min(w * 0.28, centerIcon * 0.72) : w * 0.34;
  const ellipseRy = half ? Math.min(slotH * 0.42, centerIcon * 0.62) : h * 0.22;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg face card-svg--pokemon"
      role="img"
      aria-label={`${rank} of ${card.suit}`}
    >
      <defs>
        <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={energy.main} />
          <stop offset="100%" stopColor={energy.soft} />
        </linearGradient>
      </defs>

      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill={`url(#${uid}-ring)`} stroke={BORDER} strokeWidth={1} />
      <rect
        x={2.5}
        y={2.5}
        width={w - 5}
        height={h - 5}
        rx={Math.max(0, rx - 2)}
        fill={FACE}
        stroke={BORDER}
        strokeWidth={0.6}
      />

      {/* Rank — always free of the centre badge. Corner type icon only on full face. */}
      <text x={pad} y={rankBottom} fill={BORDER} fontSize={cornerFs} fontFamily={FONT} fontWeight={800}>
        {rank}
      </text>
      {showCornerIcon ? (
        <g transform={`translate(${pad}, ${rankBottom + 2})`}>
          <EnergyIcon suit={card.suit} size={cornerIcon} color={energy.main} />
        </g>
      ) : null}

      {/* Centre energy icon. */}
      <ellipse
        cx={w / 2}
        cy={pipY}
        rx={ellipseRx}
        ry={ellipseRy}
        fill={energy.soft}
        stroke={energy.main}
        strokeWidth={1.25}
      />
      <g transform={`translate(${w / 2 - centerIcon / 2}, ${pipY - centerIcon / 2})`}>
        <EnergyIcon suit={card.suit} size={centerIcon} color={energy.main} />
      </g>

      {/* Spanish type strip (full face only — half crop hides the bottom). */}
      {!half ? (
        <>
          <rect
            x={pad}
            y={h - stripH - pad + 1}
            width={w - pad * 2}
            height={stripH}
            rx={2}
            fill={energy.main}
            opacity={0.95}
          />
          <text
            x={w / 2}
            y={h - pad - stripH / 2 + (size === 'sm' ? 2.5 : 3.5)}
            textAnchor="middle"
            fill="#fff"
            fontSize={size === 'sm' ? 7 : 9}
            fontFamily={FONT}
            fontWeight={800}
          >
            {energy.label}
          </text>
        </>
      ) : null}
    </svg>
  );
}

function BackSvg({ size, half = false }: { size: CardSize; half?: boolean }) {
  const { w, h } = CARD_PX[size];
  const rx = size === 'sm' ? 4 : 8;
  const pipY = centerPipY(h, { half });
  const r = size === 'sm' ? 12 : size === 'md' ? 17 : 24;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="card-svg back card-svg--pokemon-back"
      role="img"
      aria-label="Card back"
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={rx} fill="#2a75bb" stroke="#1a4a7a" strokeWidth={1.25} />
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={Math.max(0, rx - 2)}
        fill="none"
        stroke="#ffcb05"
        strokeWidth={1.5}
      />
      <g transform={`translate(${w / 2}, ${pipY})`}>
        <circle r={r} fill="#f0f0f0" stroke={BORDER} strokeWidth={1.25} />
        <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 L ${-r} 0`} fill="#ee1515" />
        <rect x={-r} y={-r * 0.12} width={r * 2} height={r * 0.24} fill={BORDER} />
        <circle r={r * 0.32} fill="#f0f0f0" stroke={BORDER} strokeWidth={1.5} />
        <circle r={r * 0.16} fill="#f0f0f0" stroke={BORDER} strokeWidth={1} />
      </g>
    </svg>
  );
}

export const pokemonSvgTheme: CardTheme = {
  id: 'pokemon',
  name: 'Pokémon',
  renderFace(card, size, opts?: CardRenderOptions) {
    return <FaceSvg card={card} size={size} half={opts?.half} />;
  },
  renderBack(size, opts?: CardRenderOptions) {
    return <BackSvg size={size} half={opts?.half} />;
  },
};
