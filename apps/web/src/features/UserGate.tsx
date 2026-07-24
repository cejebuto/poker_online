import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ConnectionStatus } from '../net/wsClient';
import { ActiveUsersBadge } from './ActiveUsersBadge';
import { DisclaimerModal } from './DisclaimerModal';
import { SEAT_CHIPS, SeatChip, seatChipByToken } from './SeatChip';

const CONN_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando',
  connected: 'Conectado',
  disconnected: 'Desconectado',
};

export function UserGate({
  status,
  activeUsers,
  onReady,
}: {
  status: ConnectionStatus;
  /** Registered users online (null while unknown). */
  activeUsers?: number | null;
  onReady: (user: { displayName: string; avatar: string }) => void;
}) {
  const nameId = useId();
  const chipsId = useId();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(SEAT_CHIPS[0]!.token);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 2;
  const previewName = trimmed || 'Invitado';
  const chip = seatChipByToken(avatar);

  const submit = () => {
    if (!canSubmit) return;
    onReady({ displayName: trimmed, avatar });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className="gate" aria-labelledby="gate-title">
      <header className="gate-top">
        <div className={`gate-conn gate-conn--${status}`} role="status">
          <span className={`dot ${status}`} aria-hidden />
          {CONN_LABEL[status]}
        </div>
        <div className="gate-top-right">
          <ActiveUsersBadge count={activeUsers ?? null} />
          <p className="gate-brand">MESA · TEXAS HOLD&apos;EM</p>
        </div>
      </header>

      <form className="gate-card" onSubmit={onSubmit}>
        <p className="gate-eyebrow">SIN CUENTA · JUEGO RÁPIDO</p>
        <h1 id="gate-title" className="gate-title">
          ¿Quién eres?
        </h1>
        <p className="gate-sub">Elige un nombre y un avatar para tomar asiento en la mesa.</p>

        <label className="gate-field" htmlFor={nameId}>
          <span className="gate-label">NOMBRE</span>
          <input
            id={nameId}
            className="gate-input"
            value={name}
            maxLength={20}
            autoComplete="nickname"
            autoFocus
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onNameKeyDown}
            placeholder="Tu apodo en la mesa"
          />
        </label>

        <div className="gate-field" role="group" aria-labelledby={chipsId}>
          <span id={chipsId} className="gate-label">
            ELIGE TU AVATAR
          </span>
          <div className="gate-chips">
            {SEAT_CHIPS.map((c) => {
              const selected = c.token === avatar;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={selected ? 'gate-chip selected' : 'gate-chip'}
                  aria-pressed={selected}
                  aria-label={c.label}
                  onClick={() => setAvatar(c.token)}
                >
                  <SeatChip chip={c} selected={selected} size={52} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="gate-seat" aria-live="polite">
          <SeatChip chip={chip} selected size={36} />
          <div className="gate-seat-text">
            <span className="gate-label">TU ASIENTO</span>
            <span className="gate-seat-name">{previewName}</span>
          </div>
        </div>

        <button type="submit" className="gate-cta" disabled={!canSubmit}>
          Tomar asiento
        </button>

        <button
          type="button"
          className="gate-disclaimer"
          onClick={() => setDisclaimerOpen(true)}
        >
          Aviso legal / Disclaimer
        </button>
      </form>

      <DisclaimerModal open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />
    </section>
  );
}
