import { useDrag } from '@use-gesture/react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PlayerActionName, PublicPlayer, PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { ChipStackMini } from '../chips/ChipStackMini';
import { isSwipeFlip } from '../chips/gestureMath';
import { centerOf, useChipFlights } from '../juice/ChipFlightLayer';
import {
  chipPitch,
  planChipTokens,
  snapshotSeatBets,
  type SeatBets,
} from '../juice/chipFlight';
import { useJuice } from '../juice/useJuice';
import { BetAmountModal } from './BetAmountModal';
import { ConfirmModal } from './ConfirmModal';
import { FeltMenuModal } from './FeltMenuModal';
import { loadFeltTheme, resolveFeltTheme, saveFeltTheme } from './feltTheme';
import {
  loadHeroHandedness,
  saveHeroHandedness,
  type HeroHandedness,
} from './heroHandedness';
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
import {
  buildShowdownRows,
  describeMyHand,
  describeWinnerHeadline,
  type ShowdownRow,
} from './showdown';
import { CountdownRing } from './CountdownRing';
import { WinCelebration } from './WinCelebration';
import { AllInBadge } from './AllInBadge';
import { AllInMark } from './AllInMark';
import { collectedPot, describeAction, formatChips, handCounts, potOdds, streetLabel } from './feltStats';

type ActionName = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

/** A player's most recent action, floated over their seat for a moment. */
export type SeatActionEvent = { seat: number; action: PlayerActionName; amount: number; id: number };
type ActionFloat = { label: string; key: number };
/** How long an action bubble lingers over a seat. */
const ACTION_FLOAT_MS = 1600;

type PendingConfirm = 'fold' | 'all-in' | 'amount' | null;

type TurnClockProps = {
  startedAt?: number;
  timeoutMs?: number;
  bankMs?: number;
};

/** My second card lands after the first, like a dealer going around. */
const HOLE_DEAL_STAGGER_MS = 120;

/**
 * Player felt — 3 fixed viewport zones (mobile-first):
 *
 * felt
 * ├── Z1 cartas (~20%)     street + community + menu + timer
 * ├── Z2 oponentes (~37%)  left 4 | pot | right 4 (+ showdown scroll)
 * └── Z3 mi zona (~43%)    hole (drag-x flip) + stack + actions
 *
 * Logic (actions, pot credit, equity, modals) is unchanged; only layout moves.
 * Hero live-bet slot always reserves height so posting chips never reflows Z3.
 */
export function FeltView({
  state,
  playerId,
  lastAction,
  lastActionEvent,
  nextHandSlot,
  onAction,
  onGoToLobby,
  onOpenThemes,
  onSwitchView,
  onKick,
  onRebuy,
  autoNextHand = true,
  onAutoNextHand,
}: {
  state: PublicRoomState;
  playerId: string;
  lastAction: string | null;
  /** Latest seat action, to float a bubble over that seat. */
  lastActionEvent?: SeatActionEvent | null;
  /** Between hands this replaces the hole cards entirely (see isBetweenHands). */
  nextHandSlot?: ReactNode;
  onAction: (action: ActionName, amount?: number) => void;
  onGoToLobby: () => void;
  onOpenThemes: () => void;
  onSwitchView: () => void;
  onKick: (playerId: string) => void;
  onRebuy?: () => void;
  autoNextHand?: boolean;
  onAutoNextHand?: (on: boolean) => void;
}) {
  const { play, playChip } = useJuice();
  const [pending, setPending] = useState<PendingConfirm>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feltTheme, setFeltTheme] = useState(() => loadFeltTheme());
  const [actionsSide, setActionsSide] = useState<HeroHandedness>(() => loadHeroHandedness());
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
  /** The clock only ever runs for one seat, so one ring is live at a time. */
  const turn = hasTurnTimer
    ? {
        startedAt: hand?.turnStartedAt,
        timeoutMs: hand?.turnTimeoutMs,
        bankMs: hand?.actorTimeBankMs,
      }
    : null;

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
  // Live, the center only holds chips already collected — this round's bets ride
  // beside each seat until the street sweeps them in. At showdown the pot is whole
  // again, so the win animation still flies the full amount.
  const shownPotTotal = celebrating ? potTotal : collectedPot(potTotal, state.players);
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
      if (kind === 'win') playChip('sweep');
    },
    [play, playChip],
  );

  /** Every chip of the winning line clinks a little higher than the last. */
  const onWinChipLand = useCallback(
    (index: number) => {
      playChip('land', { pitch: chipPitch(index) });
    },
    [playChip],
  );

  const stackShown = celebrating ? Math.max(0, stack - myPayout + credited) : stack;

  const columns = useMemo(
    () => layoutOpponentsForHero(state.players, playerId),
    [state.players, playerId],
  );

  // --- Chips flying from a seat into the pot when somebody bets. ---
  const seatRefs = useRef<Map<number, HTMLElement>>(new Map());
  const potRef = useRef<HTMLDivElement>(null);
  const betFlights = useChipFlights();
  const prevBets = useRef<SeatBets>({});
  const betsHandId = useRef<string | null>(null);
  const prevPhase = useRef<string | null>(null);

  const registerSeat = useCallback((seat: number, el: HTMLElement | null) => {
    if (el) seatRefs.current.set(seat, el);
    else seatRefs.current.delete(seat);
  }, []);

  const seatTarget = useCallback(
    (seat: number) => centerOf(seatRefs.current.get(seat)),
    [],
  );

  const launchBetFlights = betFlights.launch;
  // Bets ride as chips beside each seat through a betting round; when the street
  // changes they sweep into the pot together (a real table collecting), instead
  // of one flight per bet. The number under the pot grows at that same moment.
  useEffect(() => {
    const nextBets = snapshotSeatBets(state.players);
    const handId = hand?.handId ?? null;
    const phase = hand?.phase ?? null;

    // A new hand (or the first snapshot) is a baseline, never a collection.
    if (betsHandId.current !== handId) {
      betsHandId.current = handId;
      prevBets.current = nextBets;
      prevPhase.current = phase;
      return;
    }

    const streetChanged = prevPhase.current !== phase;
    prevPhase.current = phase;
    if (!streetChanged) {
      prevBets.current = nextBets;
      return;
    }

    // Street advanced: collect the bets that were live in the street just ended.
    const sweeping = prevBets.current;
    prevBets.current = nextBets;
    const pot = centerOf(potRef.current);
    if (!pot) return;

    let swept = false;
    for (const [key, amount] of Object.entries(sweeping)) {
      if (!amount) continue;
      const seat = Number(key);
      const from = seat === mySeat ? centerOf(stackTargetRef.current) : seatTarget(seat);
      if (!from) continue;

      const tokens = planChipTokens(amount, { max: 6, staggerMs: 55 });
      if (tokens.length === 0) continue;

      swept = true;
      launchBetFlights({
        from,
        to: pot,
        tokens,
        onChipLand: (i) => playChip('place', { pitch: chipPitch(i) }),
      });
    }
    if (swept) playChip('slide', { gain: 0.9 });
  }, [state.players, hand?.handId, hand?.phase, mySeat, seatTarget, launchBetFlights, playChip]);

  // --- Action bubbles floated over the seat that just acted. ---
  const [actionFloats, setActionFloats] = useState<Map<number, ActionFloat>>(new Map());
  useEffect(() => {
    if (!lastActionEvent) return;
    const { seat, action, amount, id } = lastActionEvent;
    setActionFloats((prev) => {
      const next = new Map(prev);
      // All-in (and bet/raise/call) include the amount so the shove is readable.
      next.set(seat, { label: describeAction(action, amount), key: id });
      return next;
    });
    const t = window.setTimeout(() => {
      setActionFloats((prev) => {
        // Leave a newer bubble for this seat alone.
        if (prev.get(seat)?.key !== id) return prev;
        const next = new Map(prev);
        next.delete(seat);
        return next;
      });
    }, ACTION_FLOAT_MS);
    return () => window.clearTimeout(t);
  }, [lastActionEvent]);
  // A fresh hand wipes any lingering bubbles.
  useEffect(() => {
    setActionFloats(new Map());
  }, [hand?.handId]);

  // --- Zone: hole cards (tap or drag-x → flip). ---
  const holeZoneRef = useRef<HTMLDivElement>(null);
  /** Cards are dealt covered: at a real table you lift your own corner. */
  const [holeFaceDown, setHoleFaceDown] = useState(true);
  const [holeFlips, setHoleFlips] = useState(0);

  const flipHole = useCallback(() => {
    setHoleFaceDown((down) => !down);
    setHoleFlips((n) => n + 1);
    playChip('card');
    play('tick');
  }, [play, playChip]);

  useEffect(() => {
    setHoleFaceDown(true);
    setHoleFlips(0);
  }, [hand?.handId]);

  /** Set by the touch gesture so the synthetic click it produces is ignored. */
  const lastGesture = useRef(0);

  useDrag(
    ({ movement: [mx], last, canceled, tap }) => {
      if (canceled || !last) return;
      lastGesture.current = Date.now();
      if (tap || isSwipeFlip(mx)) flipHole();
    },
    {
      target: holeZoneRef,
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  // The gesture above is touch-only; a mouse still has to be able to peek.
  const onHoleClick = useCallback(() => {
    if (Date.now() - lastGesture.current < 400) return;
    flipHole();
  }, [flipHole]);

  // Two cards sliding out of the deck, one after the other.
  const dealtCount = hand?.yourCards?.length ?? 0;
  useEffect(() => {
    if (!hand?.handId || dealtCount === 0) return;
    const timers = Array.from({ length: dealtCount }, (_, i) =>
      window.setTimeout(
        () => playChip('card', { pitch: 1 + i * 0.08 }),
        i * HOLE_DEAL_STAGGER_MS,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [hand?.handId, dealtCount, playChip]);

  const onCommunityReveal = useCallback(
    (index: number) => {
      playChip('card', { pitch: 1 + index * 0.05 });
    },
    [playChip],
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
  const showdownBySeat = useMemo(() => {
    const map = new Map<number, (typeof showdownRows)[number]>();
    for (const row of showdownRows) map.set(row.seat, row);
    return map;
  }, [showdownRows]);
  const resultText = result ? describeWinnerHeadline(showdownRows, result, state.players) : '';
  const myShowdown = mySeat !== null ? showdownBySeat.get(mySeat) : undefined;
  const myFloat = mySeat !== null ? actionFloats.get(mySeat) : undefined;

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
      if (action === 'check') playChip('check');
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
      playChip('allin');
      setPending(null);
      onAction('all-in');
    }
  };

  const street = streetLabel(hand?.phase);

  return (
    <section
      className={`felt${isMyTurn ? ' my-turn' : ''}`}
      data-actions={actionsSide}
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

        <div className="felt-community">
          {/* md (~64×90) + CSS scale in Z1; halfScale only applies in half-card mode. */}
          <CommunityRow
            cards={hand?.community ?? []}
            size="md"
            max={5}
            pad
            halfScale={1.1}
            onReveal={onCommunityReveal}
          />
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
                  side="left"
                  acting={hand?.currentToAct === p.seat}
                  isButton={hand?.button === p.seat}
                  showdown={p.seat !== null ? showdownBySeat.get(p.seat) : undefined}
                  onSeatEl={registerSeat}
                  timer={hand?.currentToAct === p.seat ? turn : null}
                  actionFloat={p.seat !== null ? actionFloats.get(p.seat) : undefined}
                />
              ) : (
                <li key={`L${i}`} className="felt-seat-slot" aria-hidden />
              ),
            )}
          </ul>

          <div className="felt-z2-center" ref={potRef}>
            <FeltPotDisplay
              pots={pots}
              potTotal={shownPotTotal}
              mySeat={mySeat}
              result={celebrating ? result : null}
              handId={hand?.handId}
              stackTargetRef={stackTargetRef}
              seatTarget={seatTarget}
              onCredit={onPotCredit}
              onFlightJuice={onFlightJuice}
              onChipLand={onWinChipLand}
            />
            {resultText ? <p className="felt-result-mini">{resultText}</p> : null}
          </div>

          <ul className="felt-rail felt-rail--right" aria-label="Asientos derecha">
            {columns.right.map((p, i) =>
              p ? (
                <FeltSeatPill
                  key={p.playerId}
                  player={p}
                  side="right"
                  acting={hand?.currentToAct === p.seat}
                  isButton={hand?.button === p.seat}
                  showdown={p.seat !== null ? showdownBySeat.get(p.seat) : undefined}
                  onSeatEl={registerSeat}
                  timer={hand?.currentToAct === p.seat ? turn : null}
                  actionFloat={p.seat !== null ? actionFloats.get(p.seat) : undefined}
                />
              ) : (
                <li key={`R${i}`} className="felt-seat-slot" aria-hidden />
              ),
            )}
          </ul>
        </div>
      </div>

      {/* ——— Z3: Mi zona (~40%) ——— */}
      <div className="felt-z3">
        {/* Slim strip only when it is my turn — no reserved spacer when idle. */}
        {isMyTurn ? (
          <div className="felt-z3-chrome">
            <div className="felt-your-turn" role="status" aria-live="assertive">
              Tu turno
            </div>
          </div>
        ) : null}

        {/*
          My seat lives outside the between-hands swap on purpose: the pot has
          to have somewhere to fly to at the exact moment the hand ends, and my
          own stack is the last thing that should ever disappear.
        */}
        <div className="felt-hero-seat">
          <div className="felt-hero-id">
            {myFloat ? (
              <span key={myFloat.key} className="felt-action-float" role="status">
                {myFloat.label}
              </span>
            ) : null}
            <CountdownRing
              startedAt={isMyTurn ? turn?.startedAt : undefined}
              timeoutMs={isMyTurn ? turn?.timeoutMs : undefined}
              bankMs={turn?.bankMs}
              size={40}
              mine
            >
              <SeatAvatar token={me?.avatar} />
            </CountdownRing>
            {iAmButton ? (
              <span className="felt-dealer felt-dealer-me" title="Sos el dealer">
                D
              </span>
            ) : null}
          </div>

          {/*
            Stack pill under a always-reserved live-bet slot. The slot keeps a
            fixed height even with no bet so posting chips never shoves the
            hole cards / action bar down (layout jump on mobile).
          */}
          <div className="felt-hero-stack">
            <div
              className="felt-hero-bet-slot"
              aria-hidden={
                Boolean(myShowdown?.cards.length) || (me?.status !== 'ALL_IN' && myBet <= 0)
              }
            >
              {!myShowdown?.cards.length && me?.status === 'ALL_IN' ? (
                <AllInBadge amount={myBet} size="md" className="felt-hero-bet" />
              ) : !myShowdown?.cards.length && myBet > 0 ? (
                <span
                  className="felt-seat-bet-chip felt-hero-bet"
                  aria-label={`Apuesta ${formatChips(myBet)}`}
                >
                  <ChipStackMini amount={myBet} size="xs" maxColumns={2} maxPerColumn={3} />
                  <span className="felt-seat-bet-amt">{formatChips(myBet)}</span>
                </span>
              ) : null}
            </div>
            <div
              ref={stackTargetRef}
              className={`felt-stack-target zone-felt-stack${me?.status === 'ALL_IN' ? ' is-allin' : ''}`}
            >
              <ChipStackMini amount={stackShown} size="xs" className="felt-my-chips" />
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
          </div>

          {/* At hand end my cards read here, small, right beside my stack — the
              same size my opponents show. */}
          {myShowdown?.cards.length ? (
            <span className="felt-seat-hole felt-hero-hole" aria-label="Tus cartas">
              {myShowdown.cards.map((card, i) => (
                <PlayingCard key={i} card={card} size="sm" halfScale={1.05} animate="reveal" />
              ))}
            </span>
          ) : (
            <span className="felt-hero-mark-spacer" aria-hidden />
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
              {/* Tap / swipe-x peeks; keyboard path is on this focusable region. */}
              <div
                className="felt-hole-cards"
                role="button"
                tabIndex={0}
                aria-pressed={!holeFaceDown}
                aria-label={holeFaceDown ? 'Ver cartas' : 'Ocultar cartas'}
                onClick={onHoleClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onHoleClick();
                  }
                }}
              >
                {/*
                  Cluster scales as one unit so the hand name stays glued just
                  under the cards (absolute-to-bottom was dumping it on the floor).
                */}
                <div className="felt-hole-cluster">
                  <div className="cards">
                    {(hand?.yourCards ?? [null, null]).map((card, i) => (
                      <PlayingCard
                        key={`${holeFlips}-${i}`}
                        card={card}
                        faceDown={!card || holeFaceDown}
                        size="lg"
                        halfScale={1.35}
                        animate={holeFlips > 0 ? 'flip' : card ? 'deal-deck' : 'none'}
                        animateDelayMs={holeFlips > 0 ? 0 : i * HOLE_DEAL_STAGGER_MS}
                      />
                    ))}
                  </div>
                  {!holeFaceDown && myHandName ? (
                    <p className="felt-hole-handname accent">{myHandName}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="felt-actionbar">
              {/* To call lives on the Call button — no third stat column. */}
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
                  className="allin fire-fx"
                  disabled={!canAllIn}
                  whileTap={canAllIn ? { scale: 0.96 } : undefined}
                  onClick={() => fire('all-in')}
                >
                  <span className="allin-btn-mark" aria-hidden>
                    <AllInMark size={18} />
                  </span>
                  All-in
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>

      {betFlights.layer}

      <WinCelebration
        open={partyOpen && myPayout > 0}
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
        actionsSide={actionsSide}
        autoNextHand={autoNextHand}
        onFeltTheme={(id) => {
          setFeltTheme(resolveFeltTheme(id));
          saveFeltTheme(id);
        }}
        onEquity={(on) => {
          setEquityOn(on);
          saveEquityEnabled(on);
        }}
        onActionsSide={(side) => {
          setActionsSide(side);
          saveHeroHandedness(side);
        }}
        onAutoNextHand={(on) => {
          onAutoNextHand?.(on);
        }}
        onKick={onKick}
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
        accent="fire"
        onCancel={closeModal}
        onConfirm={confirmPending}
      />
    </section>
  );
}

function FeltSeatPill({
  player,
  side,
  acting,
  isButton,
  showdown,
  onSeatEl,
  timer,
  actionFloat,
}: {
  player: PublicPlayer;
  /** Right rail: name first, then avatar (mirrors toward pot). */
  side: 'left' | 'right';
  acting: boolean;
  isButton: boolean;
  /** At hand end: hole cards shown next to this seat (no bottom list). */
  showdown?: ShowdownRow;
  /** Publishes the avatar node so chips know where to fly. */
  onSeatEl?: (seat: number, el: HTMLElement | null) => void;
  /** Set only on the seat that is on the clock. */
  timer?: TurnClockProps | null;
  /** A just-taken action, floated over the seat for a moment. */
  actionFloat?: ActionFloat;
}) {
  const folded = player.status === 'FOLDED';
  const revealing = Boolean(showdown?.cards.length);
  const seat = player.seat;
  const avatar = (
    <CountdownRing
      startedAt={timer?.startedAt}
      timeoutMs={timer?.timeoutMs}
      bankMs={timer?.bankMs}
      size={34}
    >
      <SeatAvatar
        token={player.avatar}
        onEl={seat === null || !onSeatEl ? undefined : (el) => onSeatEl(seat, el)}
      />
    </CountdownRing>
  );
  const hole =
    revealing && showdown ? (
      <span className="felt-seat-hole" aria-label={`Cartas de ${player.displayName}`}>
        {showdown.cards.map((card, i) => (
          <PlayingCard key={i} card={card} size="sm" halfScale={1.05} animate="reveal" />
        ))}
      </span>
    ) : null;

  // Beside the name: live bet chips, or a loud ALL-IN + amount badge.
  // Showdown seats show their result instead (below).
  // Left rail: amount then chips (value reads toward the seat). Right: chips
  // then amount — same visual grammar as avatar-on-the-outside.
  const marks = showdown ? null : player.status === 'ALL_IN' ? (
    <AllInBadge amount={player.betThisRound ?? 0} size="sm" />
  ) : player.betThisRound ? (
    <span className="felt-seat-bet-chip" aria-label={`Apuesta ${formatChips(player.betThisRound)}`}>
      {side === 'left' ? (
        <>
          <span className="felt-seat-bet-amt">{formatChips(player.betThisRound)}</span>
          <ChipStackMini amount={player.betThisRound} size="xs" maxColumns={2} maxPerColumn={3} />
        </>
      ) : (
        <>
          <ChipStackMini amount={player.betThisRound} size="xs" maxColumns={2} maxPerColumn={3} />
          <span className="felt-seat-bet-amt">{formatChips(player.betThisRound)}</span>
        </>
      )}
    </span>
  ) : null;

  const info = (
    <div className="felt-seat-pill-info">
      <span className="felt-seat-name-row">
        <span className="felt-seat-pill-name">
          {acting ? '▸ ' : ''}
          {player.displayName}
          {isButton ? <span className="felt-dealer">D</span> : null}
          {showdown?.isWinner ? <span className="felt-seat-win">WIN</span> : null}
        </span>
        {marks}
      </span>
      <span className="felt-seat-pill-stack">{formatChips(player.stack)}</span>
      {showdown ? (
        <>
          <span className="felt-seat-hand-label">{showdown.categoryLabel}</span>
          {showdown.payout > 0 ? (
            <span className="felt-seat-pill-bet">+{formatChips(showdown.payout)}</span>
          ) : null}
        </>
      ) : folded ? (
        <span className="felt-seat-pill-bet muted">Fold</span>
      ) : null}
    </div>
  );

  // Left: avatar · info · hole. Right: hole · info · avatar (both face the pot).
  const body =
    side === 'right' ? (
      <>
        {hole}
        {info}
        {avatar}
      </>
    ) : (
      <>
        {avatar}
        {info}
        {hole}
      </>
    );

  const allIn = player.status === 'ALL_IN';

  return (
    <li
      className={`felt-seat-pill felt-seat-pill--${side}${acting ? ' acting' : ''}${
        folded ? ' folded' : ''
      }${allIn ? ' is-allin' : ''}${showdown?.isWinner ? ' is-winner' : ''}${
        revealing ? ' revealing' : ''
      }`}
    >
      {actionFloat ? (
        <span key={actionFloat.key} className="felt-action-float" role="status">
          {actionFloat.label}
        </span>
      ) : null}
      {body}
    </li>
  );
}

function SeatAvatar({
  token,
  onEl,
}: {
  token?: string;
  onEl?: (el: HTMLElement | null) => void;
}) {
  const known = token && SEAT_CHIPS.some((c) => c.token === token);
  if (known && token) {
    return (
      <span className="felt-seat-pill-avatar" ref={onEl}>
        <SeatChip chip={seatChipByToken(token)} size={28} selected />
      </span>
    );
  }
  return (
    <span
      className="felt-seat-pill-avatar felt-seat-pill-avatar--fallback"
      ref={onEl}
      aria-hidden
    >
      {token && token.length <= 4 ? token : '♠'}
    </span>
  );
}
