/**
 * Subtle live count of registered app users (chose a pseudonym; room optional).
 */
export function ActiveUsersBadge({
  count,
  className = '',
}: {
  count: number | null;
  className?: string;
}) {
  if (count === null || count < 1) return null;
  const label = count === 1 ? '1 en línea' : `${count} en línea`;
  return (
    <span
      className={`active-users ${className}`.trim()}
      title="Usuarios con seudónimo conectados ahora"
      aria-live="polite"
    >
      <span className="active-users-dot" aria-hidden />
      {label}
    </span>
  );
}
