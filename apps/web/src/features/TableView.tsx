import type { PublicRoomState } from '@poker/shared';
import { CommunityRow } from '../cards/PlayingCard';
import { IsoChipStack } from '../chips/IsoChipStack';
import { describeHandResult } from './handResult';

/** Mesa device: public info only, large community cards. Never private holes. */
export function TableView({
  state,
  onOpenThemes,
}: {
  state: PublicRoomState;
  onOpenThemes?: () => void;
}) {
  const hand = state.hand;
  const pot = hand?.potTotal ?? 0;
  const handOver = !hand || hand.phase === 'COMPLETE';
  const resultText = state.lastResult
    ? describeHandResult(state.lastResult, state.players)
    : null;

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
        <CommunityRow cards={hand?.community ?? []} size="lg" pad={!handOver} />
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
              {p.seat !== null && hand?.button === p.seat ? (
                <span className="dealer-badge" title="Dealer">
                  DEALER
                </span>
              ) : null}
              {p.status ? ` · ${p.status}` : ''}
            </strong>
            <IsoChipStack amount={p.stack} compact />
            {p.betThisRound ? (
              <IsoChipStack amount={p.betThisRound} compact label="Apuesta" />
            ) : null}
          </li>
        ))}
      </ul>

      {resultText ? <p className="result card-anim-reveal">{resultText}</p> : null}
    </section>
  );
}
