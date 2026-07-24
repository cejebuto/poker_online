import { motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { useJuice } from '../juice/useJuice';
import { formatChips } from './feltStats';
import { canKickFromTable } from './kickEligibility';
import { useCopy } from './useCopy';
import type { HeroHandedness } from './heroHandedness';
import { ThemePicker } from './ThemePicker';

export type FeltMenuModalProps = {
  open: boolean;
  state: PublicRoomState;
  playerId: string;
  feltThemeId: string;
  equityOn: boolean;
  /** Which side holds Fold/Check/Raise — default right. */
  actionsSide: HeroHandedness;
  /** Host: auto-start next hand ~2s after the first. */
  autoNextHand: boolean;
  onFeltTheme: (id: string) => void;
  onEquity: (on: boolean) => void;
  onActionsSide: (side: HeroHandedness) => void;
  onAutoNextHand: (on: boolean) => void;
  onKick: (playerId: string) => void;
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
  actionsSide,
  autoNextHand,
  onFeltTheme,
  onEquity,
  onActionsSide,
  onAutoNextHand,
  onKick,
  onClose,
  onOpenThemes,
  onSwitchView,
  onGoToLobby,
}: FeltMenuModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { play, muted, toggleMuted } = useJuice();
  const { copied, copy } = useCopy<'code' | 'link'>();
  const isHost = state.hostPlayerId === playerId;

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
            <p className="felt-label">Invitar</p>
            <div className="felt-menu-invite">
              <button
                type="button"
                className="ghost small"
                onClick={() => {
                  void copy('code', state.code);
                  play('tick');
                }}
              >
                {copied === 'code' ? 'Código ✓' : `Copiar código · ${state.code}`}
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => {
                  void copy('link', state.joinUrl);
                  play('tick');
                }}
              >
                {copied === 'link' ? 'Link ✓' : 'Copiar link'}
              </button>
            </div>
          </section>

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
                    {p.playerId === playerId ? <span className="meta"> · tú</span> : null}
                  </span>
                  <span className="felt-menu-player-meta">
                    {formatChips(p.stack)}
                    {p.status ? ` · ${p.status}` : ''}
                    {!p.connected ? ' · offline' : ''}
                  </span>
                  {canKickFromTable(state, playerId, p) ? (
                    <button
                      type="button"
                      className="felt-menu-kick"
                      aria-label={`Expulsar a ${p.displayName}`}
                      onClick={() => {
                        onKick(p.playerId);
                        play('tick');
                      }}
                    >
                      Expulsar
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <ThemePicker
            feltThemeId={feltThemeId}
            onFeltTheme={onFeltTheme}
            onOpenThemes={onOpenThemes}
            onPicked={() => play('tick')}
          />

          <section className="felt-menu-section">
            <p className="felt-label">Opciones</p>
            <div className="felt-menu-options">
              {isHost ? (
                <label className="felt-menu-check">
                  <input
                    type="checkbox"
                    checked={autoNextHand}
                    onChange={(e) => {
                      onAutoNextHand(e.target.checked);
                      play('tick');
                    }}
                  />
                  <span>
                    Partida automática
                    <small> Tras la 1ª mano, espera 2s y reparte otra</small>
                  </span>
                </label>
              ) : null}
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
              <button
                type="button"
                className="ghost small"
                aria-pressed={actionsSide === 'left'}
                aria-label={
                  actionsSide === 'right'
                    ? 'Botones de acción a la derecha'
                    : 'Botones de acción a la izquierda'
                }
                onClick={() => {
                  onActionsSide(actionsSide === 'right' ? 'left' : 'right');
                  play('tick');
                }}
              >
                {actionsSide === 'right' ? '↔️ Botones a la derecha' : '↔️ Botones a la izquierda'}
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
