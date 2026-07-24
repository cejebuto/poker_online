import type { ConnectionStatus } from '../net/wsClient';

/**
 * Single status pill for gate/home headers:
 * - connected → "N en línea" (registered users)
 * - connecting / disconnected → connection label
 */
export function ActiveUsersBadge({
  status,
  count,
  className = '',
}: {
  status: ConnectionStatus;
  count: number | null;
  className?: string;
}) {
  let label: string;
  if (status === 'disconnected') {
    label = 'Desconectado';
  } else if (status === 'connecting' && count === null) {
    label = 'Conectando';
  } else if (count === null) {
    label = 'Conectando';
  } else {
    const n = Math.max(0, count);
    label = n === 1 ? '1 en línea' : `${n} en línea`;
  }

  const tone =
    status === 'disconnected'
      ? 'active-users--disconnected'
      : status === 'connecting' && count === null
        ? 'active-users--connecting'
        : '';

  return (
    <span
      className={`active-users ${tone} ${className}`.trim()}
      title={
        status === 'connected'
          ? 'Usuarios con seudónimo conectados ahora'
          : CONN_TITLE[status]
      }
      role="status"
      aria-live="polite"
    >
      <span className={`active-users-dot active-users-dot--${status}`} aria-hidden />
      {label}
    </span>
  );
}

const CONN_TITLE: Record<ConnectionStatus, string> = {
  connecting: 'Conectando al servidor',
  connected: 'Conectado',
  disconnected: 'Sin conexión al servidor',
};
