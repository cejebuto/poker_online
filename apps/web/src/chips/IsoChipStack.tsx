import {
  CHIP_COLORS,
  CHIP_DENOMS,
  encodeStackVisual,
  formatMultiplier,
  type ChipDenom,
} from './denominations';

export function IsoChipStack({
  amount,
  compact = false,
  label,
}: {
  amount: number;
  compact?: boolean;
  label?: string;
}) {
  const visual = encodeStackVisual(amount);
  return (
    <div className={`iso-stack ${compact ? 'compact' : ''}`} title={`${amount} chips`}>
      {label ? <span className="iso-label">{label}</span> : null}
      <div className="iso-row">
        {visual.bars.map((b) => (
          <div key={b.multiplier} className="chip-bar" data-mult={b.multiplier}>
            <div className="chip-bar-body">
              <span className="chip-bar-count">{b.count}</span>
              <span className="chip-bar-mult">{formatMultiplier(b.multiplier)}</span>
            </div>
          </div>
        ))}
        {visual.columns.map((col) => (
          <ChipColumnView key={col.denom} denom={col.denom} count={col.count} />
        ))}
        {visual.bars.length === 0 && visual.columns.length === 0 ? (
          <span className="meta">0</span>
        ) : null}
      </div>
      <span className="iso-amount">{amount.toLocaleString()}</span>
    </div>
  );
}

function ChipColumnView({ denom, count }: { denom: ChipDenom; count: number }) {
  const colors = CHIP_COLORS[denom];
  return (
    <div className="chip-column" data-denom={denom}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="iso-chip"
          style={{
            bottom: i * 4,
            zIndex: i,
            background: colors.face,
            borderColor: colors.rim,
            boxShadow: `0 2px 0 ${colors.edge}`,
          }}
          aria-hidden
        >
          {i === count - 1 ? <span className="iso-chip-value">{denom}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** Denomination picker chips for tap-to-increment. */
export function DenomStrip({
  active,
  onSelect,
  disabled,
}: {
  active: ChipDenom;
  onSelect: (d: ChipDenom) => void;
  disabled?: boolean;
}) {
  return (
    <div className="denom-strip" role="group" aria-label="Denominaciones">
      {CHIP_DENOMS.map((d) => (
        <button
          key={d}
          type="button"
          className={`denom-chip ${active === d ? 'active' : ''}`}
          style={{
            background: CHIP_COLORS[d].face,
            borderColor: CHIP_COLORS[d].rim,
            color: d === 1 || d === 1000 ? '#0f172a' : '#fff',
          }}
          disabled={disabled}
          onClick={() => onSelect(d)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
