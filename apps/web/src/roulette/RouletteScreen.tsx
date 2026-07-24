import { useEffect, useMemo, useState } from 'react';
import { ROULETTE, formatChips, pocketByIndex, type RoundPhase } from '@roulette/core';
import { useRoulette } from './useRoulette';
import { RouletteWheel } from './RouletteWheel';
import { RouletteBoard } from './RouletteBoard';
import { ChipRail } from './ChipRail';
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
  const [chip, setChip] = useState<number>(ROULETTE.chips[0]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

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
    <div className="rlt">
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
          <div className="rlt-balance" title="Tu saldo">
            {formatChips(rlt.balance)}
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
        <ChipRail selected={chip} balance={rlt.balance} onSelect={setChip} />

        <RouletteBoard
          bets={betsMap}
          disabled={!betting}
          onBet={(spot) => rlt.placeBet(spot, chip)}
        />

        <div className="rlt-actions">
          <button
            type="button"
            className="rlt-btn"
            disabled={!betting || rlt.bets.length === 0}
            onClick={rlt.clearBets}
          >
            Limpiar
          </button>
          {broke ? (
            <button type="button" className="rlt-btn rlt-btn--gold" onClick={rlt.topUp}>
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
