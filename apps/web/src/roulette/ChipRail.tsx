import { ROULETTE, formatChips } from '@roulette/core';

/** Denomination picker for the current bet, in the shared K/M convention. */
export function ChipRail({
  selected,
  balance,
  onSelect,
}: {
  selected: number;
  balance: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="rlt-chiprail" role="group" aria-label="Ficha">
      {ROULETTE.chips.map((value) => (
        <button
          key={value}
          type="button"
          className={`rlt-chip rlt-chip--${value}${value === selected ? ' is-selected' : ''}`}
          aria-pressed={value === selected}
          disabled={value > balance}
          onClick={() => onSelect(value)}
        >
          {formatChips(value)}
        </button>
      ))}
    </div>
  );
}
