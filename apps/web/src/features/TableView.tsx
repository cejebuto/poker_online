import type { PublicRoomState } from '@poker/shared';
import { CommunityRow } from '../cards/PlayingCard';
import { IsoChipStack } from '../chips/IsoChipStack';

/** Mesa device: public info only, large community cards. Never private holes. */
export function TableView({
  state,
  onOpenThemes,
}: {
  state: PublicRoomState;
  onOpenThemes?: () => void;
}) {
  const hand = state.hand;
  const pot = hand?.pots.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <section className="panel wide table mesa">
      <header className="row between">
        <h1>{state.config.name}</h1>
        {onOpenThemes ? (
          <button type="button" className="ghost small" onClick={onOpenThemes}>
            Temas
          </button>
        ) : null}
      </header>
      <p className="muted">Modo mesa · solo información pública</p>

      <div className="mesa-center">
        <CommunityRow cards={hand?.community ?? []} size="lg" />
        <div className={hand?.phase === 'COMPLETE' ? 'card-anim-reveal' : ''}>
          <IsoChipStack amount={pot} label="Bote" />
        </div>
        <p className="meta">Fase: {hand?.phase ?? state.phase}</p>
      </div>

      <ul className="player-list seats-ring">
        {state.players.map((p) => (
          <li
            key={p.playerId}
            className={hand?.currentToAct === p.seat ? 'to-act' : ''}
          >
            <strong>
              {p.displayName} (#{p.seat})
              {p.status ? ` · ${p.status}` : ''}
            </strong>
            <IsoChipStack amount={p.stack} compact />
            {p.betThisRound ? (
              <IsoChipStack amount={p.betThisRound} compact label="Apuesta" />
            ) : null}
          </li>
        ))}
      </ul>

      {state.lastResult ? (
        <p className="result card-anim-reveal">
          Ganadores asientos: {state.lastResult.winners.join(', ')} · reparto{' '}
          {JSON.stringify(state.lastResult.payouts)}
        </p>
      ) : null}
    </section>
  );
}
