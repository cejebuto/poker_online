import { useState } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { useOrientation } from '../hooks/useOrientation';
import { BettingPanel } from '../chips/BettingPanel';
import { IsoChipStack } from '../chips/IsoChipStack';
import { EquityBadge } from '../probability/EquityBadge';
import {
  loadEquityEnabled,
  saveEquityEnabled,
  useEquity,
} from '../probability/useEquity';
import { formatChips } from './feltStats';
import { describeHandResult } from './handResult';
import { TurnTimer } from './TurnTimer';

export function PlayerView({
  state,
  playerId,
  onAction,
  onOpenThemes,
  onSwitchView,
}: {
  state: PublicRoomState;
  playerId: string;
  onAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => void;
  onOpenThemes?: () => void;
  onSwitchView?: () => void;
}) {
  const orientation = useOrientation();
  const me = state.players.find((p) => p.playerId === playerId);
  const hand = state.hand;
  const mySeat = me?.seat ?? null;
  const isMyTurn = Boolean(hand && hand.currentToAct === mySeat && hand.phase !== 'COMPLETE');
  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  // Server-computed: `pots` is empty until the hand resolves.
  const potTotal = hand?.potTotal ?? 0;

  /** Rivals still contesting — never their cards, only the count. */
  const oppCount = hand
    ? state.players.filter((p) => {
        if (p.playerId === playerId || p.role === 'mesa' || p.seat === null) return false;
        return p.status !== 'FOLDED';
      }).length
    : 0;

  /** No live hand awaiting action: the betting controls and turn clock are meaningless. */
  const handOver = !hand || hand.phase === 'COMPLETE';
  const resultText = state.lastResult
    ? describeHandResult(state.lastResult, state.players)
    : null;

  // Hidden by default: the table is shared and the code is what lets people in.
  const [codeVisible, setCodeVisible] = useState(false);
  const [equityOn, setEquityOn] = useState(() => loadEquityEnabled());
  const equity = useEquity({
    hero: hand?.yourCards,
    community: hand?.community ?? [],
    opponents: oppCount,
    enabled: equityOn && Boolean(hand?.yourCards?.length === 2) && oppCount >= 1,
  });

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
          {onSwitchView ? (
            <button type="button" className="ghost small" onClick={onSwitchView}>
              Vista mesa
            </button>
          ) : null}
          {onOpenThemes ? (
            <button type="button" className="ghost small" onClick={onOpenThemes}>
              Temas
            </button>
          ) : null}
          <span className="meta">{hand?.phase ?? '—'}</span>
        </div>
      </header>

      <div className="player-layout">
        <div className="zone community-zone">
          <p className="muted">Comunitarias</p>
          <CommunityRow cards={hand?.community ?? []} size="sm" pad={!handOver} />
          <div className="row pot-row">
            <IsoChipStack amount={potTotal} compact label="Bote" />
            <p className="meta">
              mesa {hand?.currentBet ?? 0} · a pagar {toCall}
              {isMyTurn ? ' · TU TURNO' : ''}
            </p>
          </div>
          <TurnTimer
            turnStartedAt={hand?.turnStartedAt}
            turnTimeoutMs={hand?.turnTimeoutMs}
            timeBankMs={hand?.actorTimeBankMs}
            isMyTurn={isMyTurn}
            active={!handOver && hand.currentToAct !== null}
          />
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
          <IsoChipStack amount={me?.stack ?? 0} compact label="Tu stack" />
          <EquityBadge
            enabled={equityOn}
            onToggle={(on) => {
              setEquityOn(on);
              saveEquityEnabled(on);
            }}
            result={equity.result}
            calculating={equity.calculating}
            error={equity.error}
          />
        </div>
      </div>

      {resultText ? <p className="result">{resultText}</p> : null}

      {handOver ? null : (
        <BettingPanel
          ctx={{
            stack: me?.stack ?? 0,
            toCall,
            minRaise: hand?.minRaise ?? 10,
            currentBet: hand?.currentBet ?? 0,
            myBetThisRound: me?.betThisRound ?? 0,
            canCheck: toCall === 0,
            disabled: !isMyTurn,
          }}
          onConfirm={onAction}
        />
      )}

      <div className="table-id row between">
        <span>
          <strong>{state.config.name}</strong>
          <span className="meta"> · código </span>
          <code>{codeVisible ? state.code : '••••••'}</code>
        </span>
        <button
          type="button"
          className="ghost small"
          aria-label={codeVisible ? 'Ocultar código' : 'Mostrar código'}
          aria-pressed={codeVisible}
          onClick={() => setCodeVisible((v) => !v)}
        >
          {codeVisible ? '🙈' : '👁️'}
        </button>
      </div>

      <ul className="player-list compact">
        {state.players.map((p) => (
          <li key={p.playerId} className={hand?.currentToAct === p.seat ? 'to-act' : ''}>
            <span>
              #{p.seat} {p.displayName}
              {p.seat !== null && hand?.button === p.seat ? (
                <span className="dealer-badge" title="Dealer">
                  DEALER
                </span>
              ) : null}
              {p.status ? ` · ${p.status}` : ''}
              {hand?.currentToAct === p.seat ? ' ◀' : ''}
            </span>
            <IsoChipStack amount={p.stack} compact />
            {p.status === 'ALL_IN' ? (
              <span className="meta accent">
                All-in{p.betThisRound ? ` ${formatChips(p.betThisRound)}` : ''}
              </span>
            ) : p.betThisRound ? (
              <span className="meta">bet {formatChips(p.betThisRound)}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
