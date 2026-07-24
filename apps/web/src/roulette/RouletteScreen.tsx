import { useEffect, useMemo, useRef, useState } from 'react';
import { ROULETTE, formatChips, pocketByIndex, type RoundPhase } from '@roulette/core';
import { useRoulette } from './useRoulette';
import { RouletteWheel } from './RouletteWheel';
import { RouletteBoard } from './RouletteBoard';
import { ChipRail } from './ChipRail';
import { useRouletteJuice } from './juice/useRouletteJuice';
import './roulette.css';

const PHASE_LABEL: Record<RoundPhase, string> = {
  BETTING: 'Apuestas abiertas',
  SPINNING: 'Girando…',
  PAYOUT: 'Pagando',
};

/** The whole roulette experience: one shared table, mobile-first. */
export function RouletteScreen({
  user,
  onExit,
}: {
  user: { displayName: string; avatar?: string };
  onExit: () => void;
}) {
  const rlt = useRoulette(user);
  const juice = useRouletteJuice();
  const [chip, setChip] = useState<number>(ROULETTE.chips[0]);
  const [now, setNow] = useState(() => Date.now());
  const lastSpinKey = useRef(0);
  const lastResultKey = useRef(0);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Spin loop + decelerating stop (aligned to wheel animation).
  useEffect(() => {
    if (!rlt.spin || rlt.spin.key === lastSpinKey.current) return;
    lastSpinKey.current = rlt.spin.key;
    juice.startSpin({ durationMs: ROULETTE.spinningMs - 400 });
  }, [rlt.spin, juice]);

  // Win / lose toast SFX once per result.
  useEffect(() => {
    if (!rlt.result || rlt.result.key === lastResultKey.current) return;
    if ((rlt.state?.phase ?? 'BETTING') !== 'PAYOUT') return;
    lastResultKey.current = rlt.result.key;
    if (rlt.result.payout > 0) juice.play('win');
    else if (rlt.result.staked > 0) juice.play('lose');
    // No stake: ball-drop already played at spin settle; no extra stinger.
  }, [rlt.result, rlt.state?.phase, juice]);

  // Error chime (server rejected a bet, etc.).
  useEffect(() => {
    if (!rlt.error || rlt.error === lastError.current) return;
    lastError.current = rlt.error;
    juice.play('error');
  }, [rlt.error, juice]);

  // Stop any lingering loop when leaving the screen.
  useEffect(() => () => juice.stopSpin(), [juice]);

  const betsMap = useMemo(
    () => new Map(rlt.bets.map((b) => [b.spot, b.amount] as const)),
    [rlt.bets],
  );

  const phase = rlt.state?.phase ?? 'BETTING';
  const betting = phase === 'BETTING';
  const secondsLeft = rlt.state ? Math.max(0, Math.ceil((rlt.state.endsAt - now) / 1000)) : 0;
  const broke = rlt.balance < ROULETTE.minBet;
  const players = rlt.state?.players ?? [];

  return (
    <div className="rlt" onPointerDownCapture={juice.unlock}>
      {/*
        Stage stays pinned: wheel never leaves the viewport while the bet felt
        scrolls underneath. Pure layout — no domain changes.
      */}
      <div className="rlt-stage">
        <header className="rlt-top">
          <button type="button" className="rlt-back" onClick={onExit}>
            ← Inicio
          </button>
          <div className={`rlt-phase rlt-phase--${phase.toLowerCase()}`} aria-live="polite">
            <span className="rlt-phase-dot" />
            {PHASE_LABEL[phase]}
            {betting ? ` · ${secondsLeft}s` : ''}
          </div>
          <div className="rlt-top-end">
            <button
              type="button"
              className="rlt-mute"
              aria-pressed={juice.muted}
              aria-label={juice.muted ? 'Activar sonidos de ruleta' : 'Silenciar sonidos de ruleta'}
              title={juice.muted ? 'Sonido apagado' : 'Sonido encendido'}
              onClick={() => {
                juice.unlock();
                juice.toggleMuted();
              }}
            >
              {juice.muted ? '🔇' : '🔊'}
            </button>
            <div className="rlt-balance" title="Tu saldo">
              {formatChips(rlt.balance)}
            </div>
          </div>
        </header>

        {/*
          Outcome floats over the wheel (absolute) so "Salió / Ganaste / Perdiste"
          never reflow the stage or shove the bet felt.
        */}
        <div className="rlt-wheel-slot">
          <RouletteWheel spin={rlt.spin} winningIndex={rlt.state?.winningIndex ?? null} />
          {/* Only during PAYOUT — never while SPINNING (old toast was reappearing). */}
          {rlt.result && phase === 'PAYOUT' ? (
            <div
              key={rlt.result.key}
              className={`rlt-outcome${
                rlt.result.payout > 0 ? ' is-win' : rlt.result.staked > 0 ? ' is-lose' : ''
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="rlt-outcome-line">
                Salió <strong>{pocketByIndex(rlt.result.winningIndex).label}</strong>
              </p>
              {rlt.result.payout > 0 ? (
                <p className="rlt-outcome-line rlt-outcome-sub">
                  ¡Ganaste {formatChips(rlt.result.payout)}!
                </p>
              ) : rlt.result.staked > 0 ? (
                <p className="rlt-outcome-line rlt-outcome-sub">Perdiste</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {rlt.state?.history?.length ? (
          <div className="rlt-history" aria-label="Últimos resultados">
            {rlt.state.history.map((idx, i) => {
              const p = pocketByIndex(idx);
              return (
                <span key={`${idx}-${i}`} className={`rlt-hist rlt-color-${p.color}`}>
                  {p.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rlt-bets-scroll">
        <ChipRail
          selected={chip}
          balance={rlt.balance}
          onSelect={(value) => {
            juice.play('chip-select');
            setChip(value);
          }}
        />

        <RouletteBoard
          bets={betsMap}
          disabled={!betting}
          onBet={(spot) => {
            juice.play('bet-place');
            rlt.placeBet(spot, chip);
          }}
        />

        <div className="rlt-actions">
          <button
            type="button"
            className="rlt-btn"
            disabled={!betting || rlt.bets.length === 0}
            onClick={() => {
              juice.play('clear');
              rlt.clearBets();
            }}
          >
            Limpiar
          </button>
          {broke ? (
            <button
              type="button"
              className="rlt-btn rlt-btn--gold"
              onClick={() => {
                juice.play('chip-select');
                rlt.topUp();
              }}
            >
              Recargar
            </button>
          ) : null}
        </div>

        {players.length ? (
          <div className="rlt-players" aria-label="Jugadores">
            {players.map((p) => (
              <span
                key={p.id}
                className={`rlt-player${p.connected ? '' : ' is-off'}`}
                title={`${p.name} · ${formatChips(p.balance)}`}
              >
                {p.avatar ? `${p.avatar} ` : ''}
                {p.name}
                {p.roundStaked > 0 ? ` · ${formatChips(p.roundStaked)}` : ''}
              </span>
            ))}
          </div>
        ) : null}

        {rlt.error ? <p className="rlt-error">{rlt.error}</p> : null}
        {rlt.status !== 'connected' ? (
          <p className="rlt-conn">Conexión: {rlt.status}</p>
        ) : null}
      </div>
    </div>
  );
}
