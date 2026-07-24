import { colorForKey, formatChips } from '@roulette/core';

type Props = {
  bets: Map<string, number>;
  disabled: boolean;
  onBet: (spot: string) => void;
};

/** Straight-up 1–36, left→right in a 4-column mobile grid (design only). */
const BOARD_NUMBERS: number[] = Array.from({ length: 36 }, (_, i) => i + 1);

function Spot({
  spot,
  label,
  className,
  bets,
  disabled,
  onBet,
}: {
  spot: string;
  label: string;
  className: string;
  bets: Map<string, number>;
  disabled: boolean;
  onBet: (spot: string) => void;
}) {
  const amount = bets.get(spot) ?? 0;
  return (
    <button
      type="button"
      className={`rlt-spot ${className}`}
      disabled={disabled}
      onClick={() => onBet(spot)}
    >
      <span className="rlt-spot-label">{label}</span>
      {amount > 0 ? <span className="rlt-spot-chip">{formatChips(amount)}</span> : null}
    </button>
  );
}

/** The full American felt: 0/00, the 36 numbers, columns, dozens and the even bets. */
export function RouletteBoard({ bets, disabled, onBet }: Props) {
  const spot = (s: string, label: string, className: string) => (
    <Spot key={s} spot={s} label={label} className={className} bets={bets} disabled={disabled} onBet={onBet} />
  );

  return (
    <div className="rlt-board">
      {/* Zeros stay as their own strip; 1–36 fill a 4-column grid below. */}
      <div className="rlt-zeros">
        {spot('straight:0', '0', 'rlt-color-green')}
        {spot('straight:00', '00', 'rlt-color-green')}
      </div>

      <div className="rlt-grid" aria-label="Números 1 a 36">
        {BOARD_NUMBERS.map((n) =>
          spot(`straight:${n}`, String(n), `rlt-num rlt-color-${colorForKey(String(n))}`),
        )}
      </div>

      {/* Outside bets keep table odds (3 columns / 3 dozens) — not tied to grid columns. */}
      <div className="rlt-colbets">
        {spot('column:1', '2:1', 'rlt-outside-btn')}
        {spot('column:2', '2:1', 'rlt-outside-btn')}
        {spot('column:3', '2:1', 'rlt-outside-btn')}
      </div>

      <div className="rlt-dozens">
        {spot('dozen:1', '1ª 12', 'rlt-outside-btn')}
        {spot('dozen:2', '2ª 12', 'rlt-outside-btn')}
        {spot('dozen:3', '3ª 12', 'rlt-outside-btn')}
      </div>

      <div className="rlt-outside">
        {spot('low', '1–18', 'rlt-outside-btn')}
        {spot('high', '19–36', 'rlt-outside-btn')}
        {spot('even', 'PAR', 'rlt-outside-btn')}
        {spot('odd', 'IMPAR', 'rlt-outside-btn')}
        {spot('red', 'ROJO', 'rlt-outside-btn rlt-color-red')}
        {spot('black', 'NEGRO', 'rlt-outside-btn rlt-color-black')}
      </div>
    </div>
  );
}
