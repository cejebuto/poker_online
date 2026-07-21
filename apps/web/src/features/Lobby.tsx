import type { PublicRoomState } from '@poker/shared';
import { NextHandPrompt } from './NextHandPrompt';

export function Lobby({
  state,
  playerId,
  onStart,
  onReady,
  onLeave,
  onKick,
  onRebuy,
}: {
  state: PublicRoomState;
  playerId: string;
  onStart: () => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
  onKick: (id: string) => void;
  onRebuy?: () => void;
}) {
  const isHost = state.hostPlayerId === playerId;
  const me = state.players.find((p) => p.playerId === playerId);
  const canStart =
    isHost &&
    state.phase === 'LOBBY' &&
    state.players.filter((p) => p.role !== 'mesa' && (p.stack ?? 0) > 0 && p.status !== 'ELIMINATED')
      .length >= 2;
  const canRebuy =
    state.config.mode === 'cash' &&
    state.config.allowRebuy &&
    state.phase === 'LOBBY' &&
    me &&
    (me.stack === 0 || me.status === 'SITTING_OUT') &&
    (me.rebuyCount ?? 0) < (state.config.rebuyMax ?? 0);

  return (
    <section className="panel wide">
      <h2>Lobby — {state.config.name}</h2>
      <div className="meta-grid">
        <div>
          <strong>Código</strong>
          <div className="code">{state.code}</div>
        </div>
        <div>
          <strong>Link</strong>
          <div className="meta break">{state.joinUrl}</div>
        </div>
      </div>

      <p className="muted">
        {state.config.mode === 'tournament' ? '🏆 Torneo' : '💵 Cash'} · Blinds{' '}
        {state.effectiveSmallBlind}/{state.effectiveBigBlind}
        {state.config.doubleMinimum ? ' (doble mínimo)' : ''} · stack{' '}
        {state.config.startingStack}
        {state.config.mode === 'cash' && state.config.allowRebuy
          ? ` · rebuy máx ${state.config.rebuyMax}`
          : ''}
      </p>

      {state.tournament ? (
        <div className="tournament-banner">
          <strong>
            Nivel {state.tournament.levelIndex + 1}: {state.tournament.smallBlind}/
            {state.tournament.bigBlind}
          </strong>
          {state.tournament.nextBigBlind ? (
            <span className="meta">
              {' '}
              · siguiente {state.tournament.nextSmallBlind}/{state.tournament.nextBigBlind}
            </span>
          ) : null}
          {state.tournament.levelEndsAt ? (
            <span className="meta">
              {' '}
              · sube ~{Math.max(0, Math.ceil((state.tournament.levelEndsAt - Date.now()) / 60000))}{' '}
              min
            </span>
          ) : null}
          <div className="meta">Restan {state.tournament.playersRemaining} jugadores</div>
          {state.tournament.finished ? (
            <div className="result">
              Torneo finalizado ·{' '}
              {state.tournament.ranking
                .slice(0, 3)
                .map((r) => `#${r.place} ${r.displayName}`)
                .join(' · ')}
            </div>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'FINISHED' ? (
        <p className="result">Partida finalizada</p>
      ) : null}

      <ul className="player-list">
        {state.players.map((p) => (
          <li key={p.playerId}>
            <span>
              {p.avatar ?? '👤'} {p.displayName} {p.role === 'host' ? '👑' : ''} · asiento{' '}
              {p.seat ?? '—'} · {p.stack} fichas
              {p.status ? ` · ${p.status}` : ''}
              {p.rebuyCount ? ` · rebuys ${p.rebuyCount}` : ''}
              {p.finishPlace ? ` · #${p.finishPlace}` : ''}
              {!p.connected ? ' (offline)' : ''}
              {state.lastResult && p.ready ? ' · listo ✓' : ''}
            </span>
            {isHost && p.playerId !== playerId && p.status !== 'ELIMINATED' ? (
              <button type="button" className="ghost small" onClick={() => onKick(p.playerId)}>
                Expulsar
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Between hands the whole table votes; before the first one the host deals. */}
      {state.lastResult ? (
        <NextHandPrompt
          state={state}
          playerId={playerId}
          onReady={onReady}
          onForceStart={onStart}
        />
      ) : null}

      <div className="row">
        {isHost && state.phase === 'LOBBY' ? (
          <button type="button" className="primary" disabled={!canStart} onClick={onStart}>
            Empezar mano
          </button>
        ) : state.phase === 'LOBBY' && !state.lastResult ? (
          <p className="muted">Esperando al host…</p>
        ) : null}
        {canRebuy && onRebuy ? (
          <button type="button" className="primary" onClick={onRebuy}>
            Recomprar
          </button>
        ) : null}
        <button type="button" className="ghost" onClick={onLeave}>
          Salir
        </button>
      </div>
    </section>
  );
}
