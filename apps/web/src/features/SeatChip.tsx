/** Seat identity chips (avatar tokens stored as short unicode, max 8 chars on API). */

export type SeatChipId = 'spade' | 'heart' | 'diamond' | 'club' | 'star' | 'ace';

export type SeatChipDef = {
  id: SeatChipId;
  /** Stored in player.avatar (≤ 8 code units). */
  token: string;
  label: string;
  /** Symbol fill on the chip face. */
  ink: string;
  /** Chip face gradient end (top is always a soft highlight). */
  face: string;
  /** Outer rim when idle. */
  rim: string;
};

export const SEAT_CHIPS: readonly SeatChipDef[] = [
  { id: 'spade', token: '♠', label: 'Picas', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
  { id: 'heart', token: '♥', label: 'Corazones', ink: '#f0a0a8', face: '#1f332c', rim: '#4a6b5a' },
  { id: 'diamond', token: '♦', label: 'Diamantes', ink: '#e8a090', face: '#1f332c', rim: '#4a6b5a' },
  { id: 'club', token: '♣', label: 'Tréboles', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
  { id: 'star', token: '★', label: 'Estrella', ink: '#e8c96a', face: '#243828', rim: '#4a6b5a' },
  { id: 'ace', token: 'A', label: 'As', ink: '#f5f0e6', face: '#1a3d2e', rim: '#3d6b52' },
] as const;

export function seatChipByToken(token: string): SeatChipDef {
  return SEAT_CHIPS.find((c) => c.token === token) ?? SEAT_CHIPS[0]!;
}

/** Poker-chip glyph: rim + face + suit/mark. Pure presentational. */
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
