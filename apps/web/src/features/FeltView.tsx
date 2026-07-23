import { useDrag } from '@use-gesture/react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PublicPlayer, PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { isSwipeFlip } from '../chips/gestureMath';
import { useJuice } from '../juice/useJuice';
import { BetAmountModal } from './BetAmountModal';
import { ConfirmModal } from './ConfirmModal';
import { FeltMenuModal } from './FeltMenuModal';
import { loadFeltTheme, resolveFeltTheme, saveFeltTheme } from './feltTheme';
import { isBetweenHands } from './NextHandPrompt';
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
import { canPlayerRebuy } from './rebuy';
import { layoutOpponentsForHero } from './opponentLayout';
import { SEAT_CHIPS, SeatChip, seatChipByToken } from './SeatChip';
import { buildShowdownRows, describeMyHand, describeWinnerHeadline } from './showdown';
import { TurnTimer } from './TurnTimer';
import { WinCelebration } from './WinCelebration';
import { formatChips, handCounts, potOdds, streetLabel } from './feltStats';

type ActionName = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

type PendingConfirm = 'fold' | 'all-in' | 'amount' | null;

/**
 * Player felt — 3 fixed viewport zones (mobile-first):
 *
 * felt
 * ├── Z1 cartas (~20%)     street + community + menu + timer
 * ├── Z2 oponentes (~40%)  left 4 | pot | right 4 (+ showdown scroll)
 * └── Z3 mi zona (~40%)    hole (drag-x flip) + stack + actions
 *
 * Logic (actions, pot credit, equity, modals) is unchanged; only layout moves.
 */
export function FeltView({
  state,
  playerId,
  lastAction,
  nextHandSlot,
  onAction,
  onGoToLobby,
  onOpenThemes,
  onSwitchView,
  onRebuy,
}: {
  state: PublicRoomState;
  playerId: string;
  lastAction: string | null;
  /** Between hands this replaces the hole cards entirely (see isBetweenHands). */
  nextHandSlot?: ReactNode;
  onAction: (action: ActionName, amount?: number) => void;
  onGoToLobby: () => void;
  onOpenThemes: () => void;
  onSwitchView: () => void;
  onRebuy?: () => void;
}) {
  const { play } = useJuice();
  const [pending, setPending] = useState<PendingConfirm>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feltTheme, setFeltTheme] = useState(() => loadFeltTheme());
  const stackTargetRef = useRef<HTMLDivElement>(null);
  const hand = state.hand;
  const me = state.players.find((p) => p.playerId === playerId);
  const mySeat = me?.seat ?? null;
  const handOver = !hand || hand.phase === 'COMPLETE';
  const isMyTurn = Boolean(hand && hand.currentToAct === mySeat && !handOver);
  const iAmButton = mySeat !== null && hand?.button === mySeat;
  const betweenHands = isBetweenHands(state) && Boolean(nextHandSlot);
  const showRebuy = Boolean(onRebuy) && canPlayerRebuy(state, playerId);
  const hasTurnTimer = Boolean(
    hand?.turnTimeoutMs && hand.turnTimeoutMs > 0 && !handOver && hand.currentToAct !== null,
  );

  useEffect(() => {
    if (!isMyTurn) setPending(null);
  }, [isMyTurn]);

  const toCall = hand && me ? Math.max(0, hand.currentBet - (me.betThisRound ?? 0)) : 0;
  const myBet = me?.betThisRound ?? 0;
  const stack = me?.stack ?? 0;
  const currentBet = hand?.currentBet ?? 0;
  const minRaise = hand?.minRaise ?? state.effectiveBigBlind;
  const bigBlind = state.effectiveBigBlind;

  const pots = hand?.pots ?? [];
  const potTotal = hand?.potTotal ?? 0;
  const counts = handCounts(state.players);
  const odds = potOdds(potTotal, toCall);

  const result = state.lastResult;
  const myPayout = result && mySeat !== null ? (result.payouts[mySeat] ?? 0) : 0;
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

  const [celebratedHand, setCelebratedHand] = useState<string | null>(null);
  const [partyOpen, setPartyOpen] = useState(false);
  useEffect(() => {
    const id = hand?.handId;
    if (!id || !celebrating || myPayout <= 0) return;
    if (celebratedHand === id) return;
    setCelebratedHand(id);
    setPartyOpen(true);
  }, [hand?.handId, celebrating, myPayout, celebratedHand]);

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

  const stackShown = celebrating ? Math.max(0, stack - myPayout + credited) : stack;

  const columns = useMemo(
    () => layoutOpponentsForHero(state.players, playerId),
    [state.players, playerId],
  );

  // --- Zone: hole cards (drag-x → flip). ---
  const holeZoneRef = useRef<HTMLDivElement>(null);
  const [holeFaceDown, setHoleFaceDown] = useState(false);
  const [holeFlips, setHoleFlips] = useState(0);

  const flipHole = useCallback(() => {
    setHoleFaceDown((down) => !down);
    setHoleFlips((n) => n + 1);
    play('tick');
  }, [play]);

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

  const myHandName = holeFaceDown ? null : describeMyHand(hand?.yourCards, hand?.community ?? []);

  const [equityOn, setEquityOn] = useState(() => loadEquityEnabled());
  const equity = useEquity({
    hero: hand?.yourCards,
    community: hand?.community ?? [],
    opponents: Math.max(0, counts.inHand - 1),
    enabled: equityOn && !holeFaceDown && hand?.yourCards?.length === 2 && counts.inHand > 1,
  });

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

  const street = streetLabel(hand?.phase);

  return (
    <section
      className={`felt${isMyTurn ? ' my-turn' : ''}`}
      style={
        { '--felt-green': feltTheme.green, '--felt-dark': feltTheme.dark } as CSSProperties
      }
    >
      {/* ——— Z1: Cartas (~20%) ——— */}
      <div className="felt-z1">
        <header className="felt-z1-top">
          <span className="felt-blinds-pill">
            {state.effectiveSmallBlind}/{state.effectiveBigBlind}
          </span>
          <span className="felt-street-badge" aria-live="polite">
            {street}
          </span>
          <button
            type="button"
            className="felt-menu"
            aria-label="Menú de mesa"
            onClick={() => {
              setMenuOpen(true);
              play('tick');
            }}
          >
            ☰
          </button>
        </header>

        {hasTurnTimer ? (
          <TurnTimer
            turnStartedAt={hand?.turnStartedAt}
            turnTimeoutMs={hand?.turnTimeoutMs}
            timeBankMs={hand?.actorTimeBankMs}
            isMyTurn={isMyTurn}
            active
          />
        ) : null}

        <div className="felt-community">
          <CommunityRow cards={hand?.community ?? []} size="sm" max={5} pad halfScale={1.25} />
        </div>

        {lastAction ? <p className="felt-last-action">{lastAction}</p> : null}
      </div>

      {/* ——— Z2: Jugadores y apuestas (~40%) ——— */}
      <div className="felt-z2">
        <div className="felt-z2-grid">
          <ul className="felt-rail felt-rail--left" aria-label="Asientos izquierda">
            {columns.left.map((p, i) =>
              p ? (
                <FeltSeatPill
                  key={p.playerId}
                  player={p}
                  acting={hand?.currentToAct === p.seat}
                  isButton={hand?.button === p.seat}
                />
              ) : (
                <li key={`L${i}`} className="felt-seat-slot" aria-hidden />
              ),
            )}
          </ul>

          <div className="felt-z2-center">
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
            {resultText ? <p className="felt-result-mini">{resultText}</p> : null}
          </div>

          <ul className="felt-rail felt-rail--right" aria-label="Asientos derecha">
            {columns.right.map((p, i) =>
              p ? (
                <FeltSeatPill
                  key={p.playerId}
                  player={p}
                  acting={hand?.currentToAct === p.seat}
                  isButton={hand?.button === p.seat}
                />
              ) : (
                <li key={`R${i}`} className="felt-seat-slot" aria-hidden />
              ),
            )}
          </ul>
        </div>

        {showdownRows.length > 0 ? (
          <ul className="felt-showdown-list felt-scroll">
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
                    <PlayingCard
                      key={i}
                      card={card}
                      size="sm"
                      halfScale={1.15}
                      animate="reveal"
                    />
                  ))}
                </span>
                <span className="felt-showdown-hand">{row.categoryLabel}</span>
                {row.payout > 0 ? (
                  <span className="felt-showdown-payout accent">+{formatChips(row.payout)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ——— Z3: Mi zona (~40%) ——— */}
      <div className="felt-z3">
        <div className="felt-z3-chrome">
          {!betweenHands ? (
            <button
              type="button"
              className="felt-hide-btn"
              aria-pressed={holeFaceDown}
              onClick={flipHole}
            >
              {holeFaceDown ? 'Ver' : 'Ocultar'}
            </button>
          ) : (
            <span className="felt-hide-btn felt-hide-btn--ghost" aria-hidden />
          )}

          {isMyTurn ? (
            <div className="felt-your-turn" role="status" aria-live="assertive">
              Tu turno
            </div>
          ) : (
            <span className="felt-turn-spacer" aria-hidden />
          )}

          {iAmButton ? (
            <span className="felt-dealer felt-dealer-me" title="Sos el dealer">
              D
            </span>
          ) : (
            <span className="felt-dealer-spacer" aria-hidden />
          )}
        </div>

        {showRebuy && !betweenHands ? (
          <div className="felt-rebuy">
            <p className="meta">Te quedaste sin fichas.</p>
            <button
              type="button"
              className="primary"
              onClick={() => {
                play('confirm');
                onRebuy?.();
              }}
            >
              Recomprar
            </button>
          </div>
        ) : null}

        {betweenHands ? (
          <div className="felt-between">{nextHandSlot}</div>
        ) : (
          <div className="felt-z3-body">
            <div ref={holeZoneRef} className="felt-hole zone-felt-hole">
              <div className="cards">
                {(hand?.yourCards ?? [null, null]).map((card, i) => (
                  <PlayingCard
                    key={`${holeFlips}-${i}`}
                    card={card}
                    faceDown={!card || holeFaceDown}
                    size="lg"
                    halfScale={1.35}
                    animate={holeFlips > 0 ? 'flip' : card ? 'deal' : 'none'}
                  />
                ))}
              </div>
              <div className="felt-hole-side">
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
                <p className="felt-my-hand accent">{myHandName ?? '•••'}</p>
              </div>
            </div>

            <div className="felt-actionbar">
              <div className="felt-stats zone-felt-stats">
                <div>
                  <span className="felt-label">Equity</span>
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
                    <strong className="warn">
                      {holeFaceDown
                        ? '•••'
                        : !equityOn
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
                <div>
                  <span className="felt-label">To call</span>
                  <strong>{formatChips(toCall)}</strong>
                </div>
              </div>

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
            </div>
          </div>
        )}
      </div>

      <WinCelebration
        open={partyOpen}
        payout={myPayout}
        bigBlind={bigBlind}
        handId={hand?.handId}
        onDone={() => setPartyOpen(false)}
      />

      <FeltMenuModal
        open={menuOpen}
        state={state}
        playerId={playerId}
        feltThemeId={feltTheme.id}
        equityOn={equityOn}
        onFeltTheme={(id) => {
          setFeltTheme(resolveFeltTheme(id));
          saveFeltTheme(id);
        }}
        onEquity={(on) => {
          setEquityOn(on);
          saveEquityEnabled(on);
        }}
        onClose={() => {
          setMenuOpen(false);
          play('tick');
        }}
        onOpenThemes={() => {
          setMenuOpen(false);
          onOpenThemes();
        }}
        onSwitchView={() => {
          setMenuOpen(false);
          onSwitchView();
        }}
        onGoToLobby={() => {
          setMenuOpen(false);
          onGoToLobby();
        }}
      />

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

function FeltSeatPill({
  player,
  acting,
  isButton,
}: {
  player: PublicPlayer;
  acting: boolean;
  isButton: boolean;
}) {
  const folded = player.status === 'FOLDED';
  return (
    <li
      className={`felt-seat-pill${acting ? ' acting' : ''}${folded ? ' folded' : ''}`}
    >
      <SeatAvatar token={player.avatar} />
      <div className="felt-seat-pill-info">
        <span className="felt-seat-pill-name">
          {acting ? '▸ ' : ''}
          {player.displayName}
          {isButton ? <span className="felt-dealer">D</span> : null}
        </span>
        <span className="felt-seat-pill-stack">{formatChips(player.stack)}</span>
        {player.betThisRound ? (
          <span className="felt-seat-pill-bet">{formatChips(player.betThisRound)}</span>
        ) : folded ? (
          <span className="felt-seat-pill-bet muted">Fold</span>
        ) : player.status === 'ALL_IN' ? (
          <span className="felt-seat-pill-bet">All-in</span>
        ) : null}
      </div>
    </li>
  );
}

function SeatAvatar({ token }: { token?: string }) {
  const known = token && SEAT_CHIPS.some((c) => c.token === token);
  if (known && token) {
    return (
      <span className="felt-seat-pill-avatar">
        <SeatChip chip={seatChipByToken(token)} size={28} selected />
      </span>
    );
  }
  return (
    <span className="felt-seat-pill-avatar felt-seat-pill-avatar--fallback" aria-hidden>
      {token && token.length <= 4 ? token : '♠'}
    </span>
  );
}
