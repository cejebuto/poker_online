import { useDrag } from '@use-gesture/react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { isSwipeFlip } from '../chips/gestureMath';
import { useJuice } from '../juice/useJuice';
import { BetAmountModal } from './BetAmountModal';
import { ConfirmModal } from './ConfirmModal';
import {
  canAffordTotal,
  minAggressiveAction,
  passiveAction,
  tripleTargetAmount,
} from './feltActions';
import { FeltPotDisplay } from './FeltPotDisplay';
import {
  loadEquityEnabled,
  saveEquityEnabled,
  useEquity,
} from '../probability/useEquity';
import { buildShowdownRows, describeWinnerHeadline } from './showdown';
import { formatChips, handCounts, potOdds, streetLabel } from './feltStats';

type ActionName = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

type PendingConfirm = 'fold' | 'all-in' | 'amount' | null;

/**
 * Zone map (Vista Mesa — one continuous gesture only, the rest are taps):
 *
 * felt
 * ├── [pots-zone]     display only — magnet/vanish on hand result
 * ├── [hole-zone]     drag-x → flip my cards (the only drag on this screen)
 * ├── [stack-target]  bottom stats (magnet destination)
 * ├── [actionbar]     tap zones (see buttons)
 * ├── [showdown]      display only, after the hand
 * └── [modals]        overlay taps + native range input
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
  const { play } = useJuice();
  const [pending, setPending] = useState<PendingConfirm>(null);
  const stackTargetRef = useRef<HTMLDivElement>(null);
  const hand = state.hand;
  const me = state.players.find((p) => p.playerId === playerId);
  const mySeat = me?.seat ?? null;
  const handOver = !hand || hand.phase === 'COMPLETE';
  const isMyTurn = Boolean(hand && hand.currentToAct === mySeat && !handOver);

  // Drop pending confirms if the turn ends under the modal.
  useEffect(() => {
    if (!isMyTurn) setPending(null);
  }, [isMyTurn]);

  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  const myBet = me?.betThisRound ?? 0;
  const myCommitted = me?.committedThisHand ?? 0;
  const stack = me?.stack ?? 0;
  const currentBet = hand?.currentBet ?? 0;
  const minRaise = hand?.minRaise ?? state.effectiveBigBlind;
  const bigBlind = state.effectiveBigBlind;

  const pots = hand?.pots ?? [];
  // potTotal is authoritative while betting is live; `pots` only fills in at showdown.
  const potTotal = hand?.potTotal ?? 0;
  const counts = handCounts(state.players);
  const odds = potOdds(potTotal, toCall);

  // Server stack already includes payouts; animate from pre-payout base.
  const result = state.lastResult;
  const myPayout =
    result && mySeat !== null ? (result.payouts[mySeat] ?? 0) : 0;
  const celebrating = Boolean(result && handOver && (hand?.phase === 'COMPLETE' || result));
  const [credited, setCredited] = useState(0);
  const creditToken = useRef<string | null>(null);

  useEffect(() => {
    const token = hand?.handId ?? null;
    if (creditToken.current !== token) {
      creditToken.current = token;
      setCredited(0);
    }
    if (!celebrating) setCredited(0);
  }, [hand?.handId, celebrating]);

  const onPotCredit = useCallback((amount: number) => {
    if (amount <= 0) return;
    setCredited((c) => c + amount);
  }, []);

  const onFlightJuice = useCallback(
    (kind: 'win' | 'lose') => {
      play(kind === 'win' ? 'confirm' : 'error');
    },
    [play],
  );

  const stackShown = celebrating
    ? Math.max(0, stack - myPayout + credited)
    : stack;

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

  // --- Zone: hole cards (drag-x → flip). Swiping either way turns them over. ---
  const holeZoneRef = useRef<HTMLDivElement>(null);
  const [holeFaceDown, setHoleFaceDown] = useState(false);
  const [holeFlips, setHoleFlips] = useState(0);

  const flipHole = useCallback(() => {
    setHoleFaceDown((down) => !down);
    setHoleFlips((n) => n + 1);
    play('tick');
  }, [play]);

  // A new deal always arrives face up, whatever the last hand ended on.
  useEffect(() => {
    setHoleFaceDown(false);
  }, [hand?.handId]);

  useDrag(
    ({ movement: [mx], last, canceled, tap }) => {
      if (tap || canceled || !last) return;
      if (isSwipeFlip(mx)) flipHole();
    },
    {
      target: holeZoneRef,
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  const showdownRows = result
    ? buildShowdownRows({
        showdown: result.showdown ?? [],
        community: hand?.community ?? [],
        players: state.players,
        result,
      })
    : [];
  const resultText = result ? describeWinnerHeadline(showdownRows, result, state.players) : '';

  const passive = passiveAction(toCall);
  const aggressive = minAggressiveAction({ currentBet, minRaise, bigBlind });
  const triple = tripleTargetAmount({ currentBet, bigBlind });

  const canAggressive = isMyTurn && canAffordTotal(stack, myBet, aggressive.amount);
  const canTriple = isMyTurn && canAffordTotal(stack, myBet, triple.amount);
  const canCall = isMyTurn && toCall > 0 && stack > 0;
  const canAllIn = isMyTurn && stack > 0;

  const closeModal = useCallback(() => {
    setPending(null);
    play('tick');
  }, [play]);

  const fire = (action: ActionName, amount?: number) => {
    if (action === 'fold') {
      play('tick');
      setPending('fold');
      return;
    }
    if (action === 'all-in') {
      play('tick');
      setPending('all-in');
      return;
    }
    if (action === 'check' || action === 'call') {
      play('tick');
      onAction(action);
      return;
    }
    play('confirm');
    onAction(action, amount);
  };

  const openAmountModal = () => {
    play('tick');
    setPending('amount');
  };

  const confirmPending = () => {
    if (pending === 'fold') {
      play('confirm');
      setPending(null);
      onAction('fold');
      return;
    }
    if (pending === 'all-in') {
      play('throw');
      setPending(null);
      onAction('all-in');
    }
  };

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
          {/* Always five slots: undealt streets sit face down until they turn. */}
          <CommunityRow cards={hand?.community ?? []} size="sm" max={5} pad />

          <FeltPotDisplay
            pots={pots}
            potTotal={potTotal}
            mySeat={mySeat}
            result={celebrating ? result : null}
            handId={hand?.handId}
            stackTargetRef={stackTargetRef}
            onCredit={onPotCredit}
            onFlightJuice={onFlightJuice}
          />
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
            <dd>{formatChips(currentBet)}</dd>
            <dt>Mi apuesta</dt>
            <dd className="info">{formatChips(myCommitted)}</dd>
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

      {resultText ? (
        <section className="felt-showdown">
          <p className="result">{resultText}</p>
          {showdownRows.length ? (
            <ul className="felt-showdown-list">
              {showdownRows.map((row) => (
                <li
                  key={row.seat}
                  className={`felt-showdown-row${row.isWinner ? ' is-winner' : ''}`}
                >
                  <span className="felt-showdown-who">
                    {row.avatar ? `${row.avatar} ` : ''}
                    {row.name}
                  </span>
                  <span className="cards">
                    {row.cards.map((card, i) => (
                      <PlayingCard key={i} card={card} size="sm" animate="reveal" />
                    ))}
                  </span>
                  <span className="felt-showdown-hand">{row.categoryLabel}</span>
                  {row.payout > 0 ? (
                    <span className="felt-showdown-payout accent">
                      +{formatChips(row.payout)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* Zone: hole cards — drag-x flips them */}
      <div ref={holeZoneRef} className="felt-hole zone-felt-hole">
        <div className="felt-hole-head">
          <p className="felt-label">Mis cartas</p>
          <button
            type="button"
            className="ghost small"
            aria-pressed={holeFaceDown}
            onClick={flipHole}
          >
            {holeFaceDown ? 'Ver' : 'Ocultar'}
          </button>
        </div>
        <div className="cards">
          {(hand?.yourCards ?? [null, null]).map((card, i) => (
            <PlayingCard
              key={`${holeFlips}-${i}`}
              card={card}
              faceDown={!card || holeFaceDown}
              size="lg"
              animate={holeFlips > 0 ? 'flip' : card ? 'deal' : 'none'}
            />
          ))}
        </div>
        <p className="meta small">Deslizá ← o → para dar vuelta las cartas</p>
      </div>

      <div className="felt-actionbar">
        <div className="felt-stats zone-felt-stats">
          <div>
            <span className="felt-label">To call</span>
            <strong>{formatChips(toCall)}</strong>
          </div>
          <div ref={stackTargetRef} className="felt-stack-target zone-felt-stack">
            <span className="felt-label">Tu stack</span>
            <motion.strong
              className="accent"
              key={stackShown}
              initial={celebrating && credited > 0 ? { scale: 1.12 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              {formatChips(stackShown)}
            </motion.strong>
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
                play('tick');
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

        {/* Zone: action taps only — touch-action manipulation */}
        <div className="felt-buttons zone-felt-actions">
          {passive === 'check' ? (
            <motion.button
              type="button"
              className="check"
              disabled={!isMyTurn}
              whileTap={isMyTurn ? { scale: 0.96 } : undefined}
              onClick={() => fire('check')}
            >
              Check
            </motion.button>
          ) : (
            <motion.button
              type="button"
              className="fold"
              disabled={!isMyTurn}
              whileTap={isMyTurn ? { scale: 0.96 } : undefined}
              onClick={() => fire('fold')}
            >
              Fold
            </motion.button>
          )}

          {toCall > 0 ? (
            <motion.button
              type="button"
              className="call"
              disabled={!canCall}
              whileTap={canCall ? { scale: 0.96 } : undefined}
              onClick={() => fire('call')}
            >
              Call
              <small>{formatChips(toCall)}</small>
            </motion.button>
          ) : (
            <span className="felt-btn-spacer" aria-hidden="true" />
          )}

          <motion.button
            type="button"
            className="raise"
            disabled={!canAggressive}
            whileTap={canAggressive ? { scale: 0.96 } : undefined}
            onClick={openAmountModal}
          >
            {aggressive.kind === 'bet' ? 'Bet' : 'Raise'}
            <small>desde {formatChips(aggressive.amount)}</small>
          </motion.button>

          <motion.button
            type="button"
            className="triple"
            disabled={!canTriple}
            whileTap={canTriple ? { scale: 0.96 } : undefined}
            onClick={() => fire(triple.kind, triple.amount)}
          >
            x3
            <small>{formatChips(triple.amount)}</small>
          </motion.button>

          <motion.button
            type="button"
            className="custom"
            disabled={!canAllIn}
            whileTap={canAllIn ? { scale: 0.96 } : undefined}
            onClick={() => fire('all-in')}
          >
            All-in
          </motion.button>
        </div>

        <button type="button" className="ghost small felt-switch" onClick={onSwitchView}>
          Vista clásica
        </button>
      </div>

      <BetAmountModal
        open={pending === 'amount'}
        stack={stack}
        toCall={toCall}
        currentBet={currentBet}
        minRaise={minRaise}
        bigBlind={bigBlind}
        myBetThisRound={myBet}
        pot={potTotal}
        onCancel={closeModal}
        onConfirm={(action, amount) => {
          setPending(null);
          onAction(action, amount);
        }}
      />
      <ConfirmModal
        open={pending === 'fold'}
        title="¿Ir al mazo?"
        message="Vas a tirar tus cartas. Esta acción no se puede deshacer."
        confirmLabel="Fold"
        tone="danger"
        onCancel={closeModal}
        onConfirm={confirmPending}
      />
      <ConfirmModal
        open={pending === 'all-in'}
        title="¿All-in?"
        message={`Vas a poner todo tu stack (${formatChips(stack)}) en el bote.`}
        confirmLabel="All-in"
        tone="warn"
        onCancel={closeModal}
        onConfirm={confirmPending}
      />
    </section>
  );
}
