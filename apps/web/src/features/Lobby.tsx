import type { PublicRoomState } from '@poker/shared';

export function Lobby({
  state,
  playerId,
  onStart,
  onLeave,
  onKick,
}: {
  state: PublicRoomState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  onKick: (id: string) => void;
}) {
  const isHost = state.hostPlayerId === playerId;
  const canStart =
    isHost && state.players.filter((p) => p.role !== 'mesa').length >= 2 && state.phase === 'LOBBY';

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
        Blinds {state.config.smallBlind}/{state.config.bigBlind} · stack{' '}
        {state.config.startingStack}
      </p>
      <ul className="player-list">
        {state.players.map((p) => (
          <li key={p.playerId}>
            <span>
              {p.avatar ?? '👤'} {p.displayName}{' '}
              {p.role === 'host' ? '👑' : ''} · asiento {p.seat ?? '—'} · {p.stack} fichas
              {!p.connected ? ' (offline)' : ''}
            </span>
            {isHost && p.playerId !== playerId ? (
              <button type="button" className="ghost small" onClick={() => onKick(p.playerId)}>
                Expulsar
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="row">
        {isHost ? (
          <button type="button" className="primary" disabled={!canStart} onClick={onStart}>
            Empezar mano
          </button>
        ) : (
          <p className="muted">Esperando al host…</p>
        )}
        <button type="button" className="ghost" onClick={onLeave}>
          Salir
        </button>
      </div>
    </section>
  );
}
