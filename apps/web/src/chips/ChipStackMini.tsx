import { planMiniStack } from './miniStack';

/**
 * A small pile of physical chips — the felt's way of saying "this is money".
 * Purely decorative: whoever renders it also prints the amount.
 */
export function ChipStackMini({
  amount,
  size = 'sm',
  maxColumns,
  maxPerColumn,
  className = '',
}: {
  amount: number;
  size?: 'xs' | 'sm' | 'md';
  maxColumns?: number;
  maxPerColumn?: number;
  className?: string;
}) {
  const columns = planMiniStack(amount, { maxColumns, maxPerColumn });
  if (columns.length === 0) return null;

  return (
    <div className={`chip-mini size-${size} ${className}`.trim()} aria-hidden>
      {columns.map((col) => (
        <span className="chip-mini-col" key={col.denom} data-denom={col.denom}>
          {Array.from({ length: col.discs }, (_, i) => (
            <span
              key={i}
              className="chip-mini-disc"
              style={{
                bottom: `calc(var(--chip-mini-lift) * ${i})`,
                zIndex: i,
                background: col.face,
                borderColor: col.rim,
                boxShadow: `0 1px 0 ${col.edge}`,
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
