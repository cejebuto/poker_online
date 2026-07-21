import type { PublicRoomState } from '@poker/shared';
import { SimpleCard } from '../cards/SimpleCard';

export function PlayerView({
  state,
  playerId,
  onAction,
}: {
  state: PublicRoomState;
  playerId: string;
  onAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => void;
}) {
  const me = state.players.find((p) => p.playerId === playerId);
  const hand = state.hand;
  const mySeat = me?.seat ?? null;
  const isMyTurn = hand?.currentToAct === mySeat && hand.phase !== 'COMPLETE';
  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  const potTotal = hand?.pots.reduce((s, p) => s + p.amount, 0) ??
    state.players.reduce((s, p) => s + (p.betThisRound ?? 0), 0);

  return (
    <section className="panel wide table">
      <header className="row between">
        <h2>
          {me?.avatar} {me?.displayName}
        </h2>
        <span className="meta">
          Stack {me?.stack ?? 0} · Fase {hand?.phase ?? '—'}
        </span>
      </header>

      <div className="community">
        <p className="muted">Comunitarias</p>
        <div className="cards">
          {(hand?.community ?? []).map((c, i) => (
            <SimpleCard key={i} card={c} size="sm" />
          ))}
        </div>
      </div>

      <div className="holes">
        <p className="muted">Tus cartas</p>
        <div className="cards">
          {(hand?.yourCards ?? []).map((c, i) => (
            <SimpleCard key={i} card={c} size="lg" />
          ))}
        </div>
      </div>

      <p className="meta">
        Bote ~{potTotal} · apuesta mesa {hand?.currentBet ?? 0} · a pagar {toCall}
        {isMyTurn ? ' · TU TURNO' : ''}
      </p>

      {state.lastResult ? (
        <p className="result">
          Resultado: asientos {state.lastResult.winners.join(', ')} ·{' '}
          {JSON.stringify(state.lastResult.payouts)}
        </p>
      ) : null}

      <div className="actions">
        <button type="button" disabled={!isMyTurn} onClick={() => onAction('fold')}>
          Fold
        </button>
        <button
          type="button"
          disabled={!isMyTurn || toCall > 0}
          onClick={() => onAction('check')}
        >
          Check
        </button>
        <button
          type="button"
          disabled={!isMyTurn || toCall <= 0}
          onClick={() => onAction('call')}
        >
          Call {toCall || ''}
        </button>
        <button
          type="button"
          disabled={!isMyTurn}
          onClick={() => {
            const raiseTo = (hand?.currentBet ?? 0) + Math.max(hand?.minRaise ?? 10, 10);
            onAction(hand && hand.currentBet > 0 ? 'raise' : 'bet', Math.max(raiseTo, 10));
          }}
        >
          Bet/Raise
        </button>
        <button type="button" disabled={!isMyTurn} onClick={() => onAction('all-in')}>
          All-in
        </button>
      </div>

      <ul className="player-list compact">
        {state.players.map((p) => (
          <li key={p.playerId}>
            Asiento {p.seat}: {p.displayName} · {p.stack}
            {p.status ? ` · ${p.status}` : ''}
            {p.betThisRound ? ` · bet ${p.betThisRound}` : ''}
            {hand?.currentToAct === p.seat ? ' ◀' : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}
