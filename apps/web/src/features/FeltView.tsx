import { useState } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { PlayingCard } from '../cards/PlayingCard';
import {
  loadEquityEnabled,
  saveEquityEnabled,
  useEquity,
} from '../probability/useEquity';
import { describeHandResult } from './handResult';
import { formatChips, handCounts, potOdds, streetLabel } from './feltStats';

type ActionName = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

/**
 * Table-felt layout for phones: opponents around the felt, own cards large at the
 * bottom, one-tap actions. An alternative to PlayerView, not a replacement.
 */
export function FeltView({
  state,
  playerId,
  lastAction,
  onAction,
  onOpenMenu,
  onSwitchView,
}: {
  state: PublicRoomState;
  playerId: string;
  lastAction: string | null;
  onAction: (action: ActionName, amount?: number) => void;
  onOpenMenu: () => void;
  onSwitchView: () => void;
}) {
  const hand = state.hand;
  const me = state.players.find((p) => p.playerId === playerId);
  const mySeat = me?.seat ?? null;
  const handOver = !hand || hand.phase === 'COMPLETE';
  const isMyTurn = Boolean(hand && hand.currentToAct === mySeat && !handOver);

  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  const pots = hand?.pots ?? [];
  const sidePots = pots.slice(1);
  // potTotal is authoritative while betting is live; `pots` only fills in at showdown.
  const potTotal = hand?.potTotal ?? 0;
  const mainPot = sidePots.length ? potTotal - sidePots.reduce((s, p) => s + p.amount, 0) : potTotal;
  const counts = handCounts(state.players);
  const odds = potOdds(potTotal, toCall);

  const opponents = state.players.filter(
    (p) => p.playerId !== playerId && p.role !== 'mesa' && p.seat !== null,
  );

  const [equityOn, setEquityOn] = useState(() => loadEquityEnabled());
  const equity = useEquity({
    hero: hand?.yourCards,
    community: hand?.community ?? [],
    opponents: Math.max(0, counts.inHand - 1),
    enabled: equityOn && hand?.yourCards?.length === 2 && counts.inHand > 1,
  });

  const resultText = state.lastResult
    ? describeHandResult(state.lastResult, state.players)
    : null;

  return (
    <section className="felt">
      <header className="felt-top">
        <div className="felt-blinds">
          Blinds <b>{state.effectiveSmallBlind}</b>/<b>{state.effectiveBigBlind}</b>
        </div>
        <button type="button" className="felt-menu" aria-label="Menú" onClick={onOpenMenu}>
          ☰
        </button>
      </header>

      <div className="felt-board">
        <div className="felt-community">
          <p className="felt-label">Cartas comunitarias</p>
          <div className="cards">
            {(hand?.community ?? []).map((card, i) => (
              <PlayingCard key={i} card={card} size="sm" animate="reveal" />
            ))}
            {!hand?.community?.length ? <p className="meta">Sin repartir</p> : null}
          </div>

          <div className="felt-pot">
            <p className="felt-label">Bote principal</p>
            <strong className="felt-pot-amount">{formatChips(mainPot)}</strong>
          </div>

          {sidePots.length ? (
            <div className="felt-sidepots">
              {sidePots.map((pot, i) => (
                <div key={i} className="felt-sidepot">
                  <span className="felt-label">Side pot {i + 1}</span>
                  <strong>{formatChips(pot.amount)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="felt-status">
          <p className="felt-label">Estado de la mano</p>
          <dl>
            <dt>Calle actual</dt>
            <dd className="accent">{streetLabel(hand?.phase)}</dd>
            <dt>Jugadores en mano</dt>
            <dd>
              {counts.inHand} / {counts.seated}
            </dd>
            <dt>Última acción</dt>
            <dd>{lastAction ?? '—'}</dd>
            <dt>Apuesta más alta</dt>
            <dd>{formatChips(hand?.currentBet ?? 0)}</dd>
          </dl>
        </aside>
      </div>

      <ul className="felt-seats">
        {opponents.map((p) => (
          <li
            key={p.playerId}
            className={`felt-seat${hand?.currentToAct === p.seat ? ' acting' : ''}${
              p.status === 'FOLDED' ? ' folded' : ''
            }`}
          >
            <span className="felt-avatar" aria-hidden="true">
              {p.avatar ?? '👤'}
            </span>
            <span className="felt-seat-info">
              <span className="felt-seat-name">
                {hand?.currentToAct === p.seat ? '▸ ' : ''}
                {p.displayName}
                {hand?.button === p.seat ? <span className="felt-dealer">D</span> : null}
              </span>
              <span className="felt-seat-stack">{formatChips(p.stack)}</span>
              {p.betThisRound ? (
                <span className="felt-seat-bet">Bet {formatChips(p.betThisRound)}</span>
              ) : p.status === 'FOLDED' ? (
                <span className="felt-seat-bet muted">Fold</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {resultText ? <p className="result">{resultText}</p> : null}

      <div className="felt-hole">
        <p className="felt-label">Mis cartas</p>
        <div className="cards">
          {(hand?.yourCards ?? [null, null]).map((card, i) => (
            <PlayingCard key={i} card={card} faceDown={!card} size="lg" animate={card ? 'deal' : 'none'} />
          ))}
        </div>
      </div>

      <div className="felt-actionbar">
        <div className="felt-stats">
          <div>
            <span className="felt-label">To call</span>
            <strong>{formatChips(toCall)}</strong>
          </div>
          <div>
            <span className="felt-label">Tu stack</span>
            <strong className="accent">{formatChips(me?.stack ?? 0)}</strong>
          </div>
          <div>
            <button
              type="button"
              className="felt-equity"
              aria-pressed={equityOn}
              onClick={() => {
                const next = !equityOn;
                setEquityOn(next);
                saveEquityEnabled(next);
              }}
            >
              <span className="felt-label">Equity</span>
              <strong className="warn">
                {!equityOn
                  ? 'off'
                  : equity.calculating
                    ? '…'
                    : equity.result
                      ? `${equity.result.winPct.toFixed(0)}%`
                      : '—'}
              </strong>
            </button>
          </div>
          <div>
            <span className="felt-label">Pot odds</span>
            <strong className="info">{odds ?? '—'}</strong>
          </div>
        </div>

        <div className="felt-buttons">
          <button
            type="button"
            className="fold"
            disabled={!isMyTurn}
            onClick={() => onAction('fold')}
          >
            Fold
          </button>
          {toCall === 0 ? (
            <button
              type="button"
              className="call"
              disabled={!isMyTurn}
              onClick={() => onAction('check')}
            >
              Check
            </button>
          ) : (
            <button
              type="button"
              className="call"
              disabled={!isMyTurn}
              onClick={() => onAction('call')}
            >
              Call
              <small>{formatChips(toCall)}</small>
            </button>
          )}
          <button
            type="button"
            className="raise"
            disabled={!isMyTurn || (me?.stack ?? 0) <= toCall}
            onClick={() => onAction('raise', (hand?.minRaise ?? 0) || undefined)}
          >
            Raise
          </button>
          <button
            type="button"
            className="triple"
            disabled={!isMyTurn || (me?.stack ?? 0) <= (hand?.currentBet ?? 0) * 3}
            onClick={() => onAction('raise', (hand?.currentBet ?? 0) * 3)}
          >
            x3
            <small>{formatChips((hand?.currentBet ?? 0) * 3)}</small>
          </button>
          <button
            type="button"
            className="custom"
            disabled={!isMyTurn}
            onClick={() => onAction('all-in')}
          >
            All-in
          </button>
        </div>

        <button type="button" className="ghost small felt-switch" onClick={onSwitchView}>
          Vista clásica
        </button>
      </div>
    </section>
  );
}
