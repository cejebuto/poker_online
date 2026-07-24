/** Seat identity avatars (tokens stored as short strings, max 8 chars on API). */

import type { ReactNode } from 'react';

export type SeatChipId =
  | 'spade'
  | 'heart'
  | 'diamond'
  | 'club'
  | 'star'
  | 'ace'
  | 'crown'
  | 'skull'
  | 'fox'
  | 'robot'
  | 'flame'
  | 'leaf'
  | 'moon'
  | 'bolt';

export type SeatChipDef = {
  id: SeatChipId;
  /** Stored in player.avatar (≤ 8 code units). */
  token: string;
  label: string;
  /** Legacy poker-chip fields — used only when `render` is absent. */
  ink?: string;
  face?: string;
  rim?: string;
  /**
   * Self-contained avatar art. When present it fully replaces the chip drawing,
   * so an avatar can be any shape (a fox, a flame, a diamond plate…) — not just
   * a round chip. Returns a complete `<svg>`; selection chrome is added by the
   * wrapper, so this stays purely the artwork.
   */
  render?: (size: number) => ReactNode;
};

// —— The six original poker chips (round, suit/mark on a felt-green face). ——
const CHIP_DEFS: SeatChipDef[] = [
  { id: 'spade', token: '♠', label: 'Picas', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
  { id: 'heart', token: '♥', label: 'Corazones', ink: '#f0a0a8', face: '#1f332c', rim: '#4a6b5a' },
  { id: 'diamond', token: '♦', label: 'Diamantes', ink: '#e8a090', face: '#1f332c', rim: '#4a6b5a' },
  { id: 'club', token: '♣', label: 'Tréboles', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
  { id: 'star', token: '★', label: 'Estrella', ink: '#e8c96a', face: '#243828', rim: '#4a6b5a' },
  { id: 'ace', token: 'A', label: 'As', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
];

// —— Eight extra avatars, each its own shape + palette (fan-designed art). ——
function svg(size: number, children: ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {children}
    </svg>
  );
}

const AVATAR_DEFS: SeatChipDef[] = [
  {
    id: 'crown',
    token: 'crown',
    label: 'Corona',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-crown-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2c2447" />
              <stop offset="1" stopColor="#171029" />
            </linearGradient>
            <linearGradient id="av-crown-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe98a" />
              <stop offset="1" stopColor="#dd9f27" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="54" height="54" rx="16" fill="url(#av-crown-bg)" stroke="#4a3d6b" strokeWidth="1.5" />
          <path d="M16 43 L16 25 L26 33 L32 20 L38 33 L48 25 L48 43 Z" fill="url(#av-crown-gold)" stroke="#8a5a12" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="16" y="42" width="32" height="7" rx="2.5" fill="url(#av-crown-gold)" stroke="#8a5a12" strokeWidth="1.2" />
          <circle cx="32" cy="27" r="2.6" fill="#e2483d" />
          <circle cx="22" cy="33" r="1.8" fill="#3aa0e0" />
          <circle cx="42" cy="33" r="1.8" fill="#3aa0e0" />
        </>,
      ),
  },
  {
    id: 'skull',
    token: 'skull',
    label: 'Calavera',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-skull-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#263049" />
              <stop offset="1" stopColor="#141b2b" />
            </linearGradient>
          </defs>
          <polygon points="32,5 55,18 55,46 32,59 9,46 9,18" fill="url(#av-skull-bg)" stroke="#0c1220" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M32 18 C23 18 19 25 19 33 C19 38 22 41 23 44 L23 48 L28 48 L28 44 L31 44 L31 48 L33 48 L33 44 L36 44 L36 48 L41 48 L41 44 C42 41 45 38 45 33 C45 25 41 18 32 18 Z" fill="#eef1ee" />
          <ellipse cx="27" cy="33" rx="3.6" ry="4" fill="#141b2b" />
          <ellipse cx="37" cy="33" rx="3.6" ry="4" fill="#141b2b" />
          <path d="M32 37 l-2.4 5 h4.8 z" fill="#141b2b" />
        </>,
      ),
  },
  {
    id: 'fox',
    token: 'fox',
    label: 'Zorro',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-fox-o" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9648" />
              <stop offset="1" stopColor="#e8611f" />
            </linearGradient>
          </defs>
          <path d="M12 15 L27 27 L20 41 Z" fill="url(#av-fox-o)" />
          <path d="M52 15 L37 27 L44 41 Z" fill="url(#av-fox-o)" />
          <path d="M16 19 L24 27 L21 35 Z" fill="#3a1f14" />
          <path d="M48 19 L40 27 L43 35 Z" fill="#3a1f14" />
          <path d="M32 55 C20 55 15 43 18 30 C20 24 26 22 32 22 C38 22 44 24 46 30 C49 43 44 55 32 55 Z" fill="url(#av-fox-o)" />
          <path d="M32 55 C26 55 22 49 22 42 L32 38 L42 42 C42 49 38 55 32 55 Z" fill="#f7efe6" />
          <ellipse cx="26" cy="35" rx="2.4" ry="3" fill="#241611" />
          <ellipse cx="38" cy="35" rx="2.4" ry="3" fill="#241611" />
          <path d="M32 47 l-2.6 -3.4 h5.2 z" fill="#241611" />
        </>,
      ),
  },
  {
    id: 'robot',
    token: 'robot',
    label: 'Robot',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-robot-m" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d2dc" />
              <stop offset="1" stopColor="#7c8794" />
            </linearGradient>
          </defs>
          <line x1="32" y1="7" x2="32" y2="17" stroke="#9aa4b0" strokeWidth="2.4" />
          <circle cx="32" cy="6" r="3.2" fill="#e2483d" />
          <rect x="7" y="27" width="6" height="13" rx="2.5" fill="#8a94a0" />
          <rect x="51" y="27" width="6" height="13" rx="2.5" fill="#8a94a0" />
          <rect x="12" y="16" width="40" height="39" rx="10" fill="url(#av-robot-m)" stroke="#5a6470" strokeWidth="1.5" />
          <rect x="18" y="23" width="28" height="19" rx="5" fill="#101f2b" />
          <circle cx="26" cy="32" r="3.4" fill="#4fd1e0" />
          <circle cx="38" cy="32" r="3.4" fill="#4fd1e0" />
          <rect x="24" y="46" width="16" height="4" rx="2" fill="#5a6470" />
        </>,
      ),
  },
  {
    id: 'flame',
    token: 'flame',
    label: 'Llama',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-flame-o" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd24a" />
              <stop offset="0.5" stopColor="#ff8a2a" />
              <stop offset="1" stopColor="#e23b1f" />
            </linearGradient>
            <linearGradient id="av-flame-i" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff3b0" />
              <stop offset="1" stopColor="#ffb038" />
            </linearGradient>
          </defs>
          <path d="M32 5 C41 18 50 24 50 38 C50 50 42 59 32 59 C22 59 14 51 14 39 C14 30 20 25 24 31 C26 22 30 15 32 5 Z" fill="url(#av-flame-o)" />
          <path d="M32 24 C37 32 42 36 42 44 C42 51 38 56 32 56 C27 56 23 52 23 46 C23 40 26 38 28 41 C29 34 31 30 32 24 Z" fill="url(#av-flame-i)" />
        </>,
      ),
  },
  {
    id: 'leaf',
    token: 'leaf',
    label: 'Hoja',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-leaf-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7ee38a" />
              <stop offset="1" stopColor="#2e9c4a" />
            </linearGradient>
          </defs>
          <path d="M13 51 C13 26 30 11 53 11 C53 34 39 53 13 51 Z" fill="url(#av-leaf-g)" stroke="#1f6e34" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M19 47 C30 39 41 27 49 17" fill="none" stroke="#1f6e34" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M28 41 l7 -3 M34 33 l7 -3 M40 27 l5 -2" stroke="#1f6e34" strokeWidth="1.6" strokeLinecap="round" />
        </>,
      ),
  },
  {
    id: 'moon',
    token: 'moon',
    label: 'Luna',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <radialGradient id="av-moon-bg" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#2a3a63" />
              <stop offset="1" stopColor="#101830" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="27" fill="url(#av-moon-bg)" stroke="#3a4a78" strokeWidth="1.5" />
          <path d="M41 15 A18 18 0 1 0 41 49 A14 14 0 1 1 41 15 Z" fill="#f2e6a8" />
          <path d="M22 21 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1 z" fill="#f2e6a8" />
          <circle cx="25" cy="45" r="1.5" fill="#cdd6f0" />
          <circle cx="45" cy="43" r="1.1" fill="#cdd6f0" />
        </>,
      ),
  },
  {
    id: 'bolt',
    token: 'bolt',
    label: 'Rayo',
    render: (s) =>
      svg(
        s,
        <>
          <defs>
            <linearGradient id="av-bolt-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b2f3a" />
              <stop offset="1" stopColor="#14161d" />
            </linearGradient>
            <linearGradient id="av-bolt-y" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff07a" />
              <stop offset="1" stopColor="#f5b400" />
            </linearGradient>
          </defs>
          <rect x="14" y="14" width="36" height="36" rx="8" transform="rotate(45 32 32)" fill="url(#av-bolt-bg)" stroke="#3a3f4c" strokeWidth="1.5" />
          <path d="M36 13 L21 36 L30 36 L27 51 L44 27 L34 27 Z" fill="url(#av-bolt-y)" stroke="#a97a00" strokeWidth="1" strokeLinejoin="round" />
        </>,
      ),
  },
];

export const SEAT_CHIPS: readonly SeatChipDef[] = [...CHIP_DEFS, ...AVATAR_DEFS];

export function seatChipByToken(token: string): SeatChipDef {
  return SEAT_CHIPS.find((c) => c.token === token) ?? SEAT_CHIPS[0]!;
}

/**
 * Renders a seat avatar. Chip defs draw the classic round chip; defs carrying
 * their own `render` draw arbitrary art. Selection is a glow on the wrapper so
 * it reads on any silhouette, round or not.
 */
export function SeatChip({
  chip,
  selected = false,
  size = 48,
  className,
}: {
  chip: SeatChipDef;
  selected?: boolean;
  size?: number;
  className?: string;
}) {
  if (chip.render) {
    return (
      <span
        className={`seat-avatar${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}
        style={{ width: size, height: size }}
      >
        {chip.render(size)}
      </span>
    );
  }

  const rim = selected ? '#d4b06a' : chip.rim;
  const glow = selected ? '0 0 0 2px rgba(212,176,106,0.35)' : 'none';
  const symbol =
    chip.id === 'ace' ? (
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontWeight="700"
        fill={chip.ink}
      >
        A
      </text>
    ) : (
      <text
        x="32"
        y="39"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize={chip.id === 'star' ? '20' : '22'}
        fill={chip.ink}
      >
        {chip.token}
      </text>
    );

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={{ boxShadow: glow, borderRadius: '50%' }}
    >
      {/* Soft drop shadow */}
      <ellipse cx="32" cy="34" rx="28" ry="28" fill="rgba(0,0,0,0.28)" />
      {/* Outer rim */}
      <circle cx="32" cy="32" r="28" fill={rim} />
      {/* Edge band (casino notches via dashed stroke) */}
      <circle
        cx="32"
        cy="32"
        r="24.5"
        fill="none"
        stroke={selected ? '#f0d9a0' : 'rgba(255,255,255,0.12)'}
        strokeWidth="3.2"
        strokeDasharray="4.2 3.6"
      />
      {/* Face */}
      <circle cx="32" cy="32" r="20" fill={chip.face} />
      {/* Top highlight */}
      <ellipse cx="32" cy="24" rx="14" ry="8" fill="rgba(255,255,255,0.08)" />
      {/* Inner ring */}
      <circle
        cx="32"
        cy="32"
        r="17.5"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      {symbol}
      {/* Selected gold outer ring */}
      {selected ? (
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#d4b06a"
          strokeWidth="2.5"
          opacity="0.95"
        />
      ) : null}
    </svg>
  );
}
