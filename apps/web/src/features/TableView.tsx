import type { PublicRoomState } from '@poker/shared';
import { SimpleCard } from '../cards/SimpleCard';

/** Mesa device: public info only, large community cards. */
export function TableView({ state }: { state: PublicRoomState }) {
  const hand = state.hand;
  const pot = hand?.pots.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <section className="panel wide table mesa">
      <h1>{state.config.name}</h1>
      <p className="muted">Modo mesa · solo información pública</p>
      <div className="community large">
        {(hand?.community ?? []).map((c, i) => (
          <SimpleCard key={i} card={c} size="lg" />
        ))}
      </div>
      <p className="pot">Bote: {pot || '—'}</p>
      <p className="meta">Fase: {hand?.phase ?? state.phase}</p>
      <ul className="player-list">
        {state.players.map((p) => (
          <li key={p.playerId}>
            {p.displayName} (#{p.seat}) · {p.stack} fichas
            {p.betThisRound ? ` · apuesta ${p.betThisRound}` : ''}
          </li>
        ))}
      </ul>
      {state.lastResult ? (
        <p className="result">Ganadores asientos: {state.lastResult.winners.join(', ')}</p>
      ) : null}
      {/* Privacy: never render yourCards on mesa */}
    </section>
  );
}
