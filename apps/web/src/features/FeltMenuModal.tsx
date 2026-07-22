import { motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { useCardTheme } from '../cards/ThemeRegistry';
import { useJuice } from '../juice/useJuice';
import { FELT_THEMES, type FeltTheme } from './feltTheme';
import { formatChips } from './feltStats';

export type FeltMenuModalProps = {
  open: boolean;
  state: PublicRoomState;
  playerId: string;
  feltThemeId: string;
  equityOn: boolean;
  onFeltTheme: (id: string) => void;
  onEquity: (on: boolean) => void;
  onClose: () => void;
  onOpenThemes: () => void;
  onSwitchView: () => void;
  onGoToLobby: () => void;
};

/**
 * Table menu that never leaves the table.
 *
 * Zone map: taps and native selects only (`zone-felt-menu`) — no drag, so it
 * cannot fight the hole-card swipe underneath it.
 */
export function FeltMenuModal({
  open,
  state,
  playerId,
  feltThemeId,
  equityOn,
  onFeltTheme,
  onEquity,
  onClose,
  onOpenThemes,
  onSwitchView,
  onGoToLobby,
}: FeltMenuModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { themes, activeId, setActiveId } = useCardTheme();
  const { play, muted, toggleMuted } = useJuice();

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const seated = state.players.filter((p) => p.role !== 'mesa');
  const button = state.hand?.button;

  const pickFelt = (theme: FeltTheme) => {
    onFeltTheme(theme.id);
    play('tick');
  };

  return (
    <div className="confirm-modal-root zone-felt-menu" role="presentation">
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <motion.div
        className="confirm-modal-panel felt-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="felt-menu-head">
          <h2 id={titleId} className="confirm-modal-title">
            Mesa
          </h2>
          <button ref={closeRef} type="button" className="ghost small" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="felt-menu-body">
          <section className="felt-menu-section">
            <p className="felt-label">Jugadores ({seated.length})</p>
            <ul className="felt-menu-players">
              {seated.map((p) => (
                <li key={p.playerId} className={p.playerId === playerId ? 'is-me' : ''}>
                  <span className="felt-menu-player-name">
                    {p.avatar ?? '👤'} {p.displayName}
                    {p.role === 'host' ? ' 👑' : ''}
                    {p.seat !== null && p.seat === button ? (
                      <span className="felt-dealer">D</span>
                    ) : null}
                    {p.playerId === playerId ? <span className="meta"> · vos</span> : null}
                  </span>
                  <span className="felt-menu-player-meta">
                    {formatChips(p.stack)}
                    {p.status ? ` · ${p.status}` : ''}
                    {!p.connected ? ' · offline' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="felt-menu-section">
            <p className="felt-label">Cartas</p>
            <label className="field">
              Tema
              <select
                value={activeId}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  play('tick');
                }}
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="ghost small" onClick={onOpenThemes}>
              Ajustes avanzados (cargar set propio)
            </button>
          </section>

          <section className="felt-menu-section">
            <p className="felt-label">Paño</p>
            <div className="felt-menu-swatches">
              {FELT_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`felt-menu-swatch${t.id === feltThemeId ? ' is-active' : ''}`}
                  aria-pressed={t.id === feltThemeId}
                  title={t.name}
                  style={{
                    background: `radial-gradient(ellipse at 50% 30%, ${t.green}, ${t.dark} 75%)`,
                  }}
                  onClick={() => pickFelt(t)}
                >
                  <span className="visually-hidden">{t.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="felt-menu-section">
            <p className="felt-label">Opciones</p>
            <div className="felt-menu-options">
              <button
                type="button"
                className="ghost small"
                aria-pressed={!muted}
                onClick={() => {
                  toggleMuted();
                  play('tick');
                }}
              >
                {muted ? '🔇 Sonido apagado' : '🔊 Sonido encendido'}
              </button>
              <button
                type="button"
                className="ghost small"
                aria-pressed={equityOn}
                onClick={() => {
                  onEquity(!equityOn);
                  play('tick');
                }}
              >
                {equityOn ? '📊 Equity visible' : '📊 Equity oculta'}
              </button>
              <button type="button" className="ghost small" onClick={onSwitchView}>
                Vista clásica
              </button>
              <button type="button" className="ghost small" onClick={onGoToLobby}>
                Volver al lobby
              </button>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
