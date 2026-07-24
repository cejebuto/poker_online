import { AllInMark } from './AllInMark';
import { describeAction, formatChips } from './feltStats';

/**
 * Persistent all-in marker on a seat: triangle + ALL-IN + shove amount.
 * Replaces the bare triangle so the shove is readable for hero and opponents.
 */
export function AllInBadge({
  amount,
  size = 'sm',
  className = '',
}: {
  /** Chips committed this round (0 after a street sweep still shows ALL-IN). */
  amount: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const label = describeAction('all-in', amount);
  const markSize = size === 'md' ? 14 : 12;

  return (
    <span
      className={`felt-allin-badge felt-allin-badge--${size} fire-fx ${className}`.trim()}
      role="status"
      title={label}
      aria-label={label}
    >
      <AllInMark size={markSize} className="felt-allin-badge-mark" />
      <span className="felt-allin-badge-text">ALL-IN</span>
      {amount > 0 ? <span className="felt-allin-badge-amt">{formatChips(amount)}</span> : null}
    </span>
  );
}
