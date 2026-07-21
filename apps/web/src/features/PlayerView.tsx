import type { PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { useOrientation } from '../hooks/useOrientation';

export function PlayerView({
  state,
  playerId,
  onAction,
  onOpenThemes,
}: {
  state: PublicRoomState;
  playerId: string;
  onAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => void;
  onOpenThemes?: () => void;
}) {
  const orientation = useOrientation();
  const me = state.players.find((p) => p.playerId === playerId);
  const hand = state.hand;
  const mySeat = me?.seat ?? null;
  const isMyTurn = hand?.currentToAct === mySeat && hand.phase !== 'COMPLETE';
  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  const potTotal =
    hand?.pots.reduce((s, p) => s + p.amount, 0) ??
    state.players.reduce((s, p) => s + (p.betThisRound ?? 0), 0);

  return (
    <section
      className={`panel wide table player-view orient-${orientation}`}
      data-orientation={orientation}
    >
      <header className="row between">
        <h2>
          {me?.avatar} {me?.displayName}
        </h2>
        <div className="row">
          {onOpenThemes ? (
            <button type="button" className="ghost small" onClick={onOpenThemes}>
              Temas
            </button>
          ) : null}
          <span className="meta">
            Stack {me?.stack ?? 0} · {hand?.phase ?? '—'}
          </span>
        </div>
      </header>

      <div className="player-layout">
        <div className="zone community-zone">
          <p className="muted">Comunitarias</p>
          <CommunityRow cards={hand?.community ?? []} size="sm" />
          <p className="meta">
            Bote ~{potTotal} · mesa {hand?.currentBet ?? 0} · a pagar {toCall}
            {isMyTurn ? ' · TU TURNO' : ''}
          </p>
        </div>

        <div className="zone holes-zone">
          <p className="muted">Tus cartas</p>
          <div className="cards holes">
            {(hand?.yourCards ?? [null, null]).map((c, i) => (
              <PlayingCard
                key={i}
                card={c}
                faceDown={!c}
                size="lg"
                animate={c ? 'deal' : 'none'}
              />
            ))}
          </div>
        </div>
      </div>

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
        <button type="button" disabled={!isMyTurn || toCall > 0} onClick={() => onAction('check')}>
          Check
        </button>
        <button type="button" disabled={!isMyTurn || toCall <= 0} onClick={() => onAction('call')}>
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
          <li key={p.playerId} className={hand?.currentToAct === p.seat ? 'to-act' : ''}>
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
