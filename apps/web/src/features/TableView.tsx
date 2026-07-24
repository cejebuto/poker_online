import { useState, type CSSProperties } from 'react';
import type { PublicRoomState } from '@poker/shared';
import { CommunityRow, PlayingCard } from '../cards/PlayingCard';
import { potLabel, resolvePotList } from './feltPotAnim';
import { formatChips, streetLabel } from './feltStats';
import { loadFeltTheme, resolveFeltTheme, saveFeltTheme } from './feltTheme';
import { orderedTableSeats, seatRingPositions } from './seatRing';
import { buildShowdownRows, describeWinnerHeadline, type ShowdownRow } from './showdown';
import { ThemeModal } from './ThemeModal';

/** How far in from the seats the dealer button sits, as a share of the ring. */
const BUTTON_RING_SCALE = 0.66;

/**
 * Mesa device: the shared screen. Public information only — this component never
 * receives another player's hole cards until the server reveals them at showdown.
 *
 * Layout is an oval with the community cards at the middle and the seats spread
 * around the rim by `seatRingPositions`, which handles 2 through 9 with one
 * formula. Under 720px the absolute positioning is dropped (see styles.css) and
 * the seats fall back to a flowing grid.
 */
export function TableView({
  state,
  onOpenThemes,
}: {
  state: PublicRoomState;
  onOpenThemes?: () => void;
}) {
  const hand = state.hand;
  const handOver = !hand || hand.phase === 'COMPLETE';
  const result = state.lastResult;

  const seats = orderedTableSeats(state.players);
  const ring = seatRingPositions(seats.length);
  // Same angles, shorter radius: the button lands between its seat and the board.
  const buttonRing = seatRingPositions(seats.length, BUTTON_RING_SCALE);
  const buttonIndex = seats.findIndex((p) => p.seat !== null && p.seat === hand?.button);
  const buttonSpot = buttonIndex >= 0 ? buttonRing[buttonIndex] : undefined;

  const pots = resolvePotList(hand?.pots ?? [], hand?.potTotal ?? 0);
  const potTotal = pots.reduce((sum, p) => sum + p.amount, 0);

  // The server only puts non-folded players in `showdown`, so whoever mucked
  // early simply has no row here — that filter is not re-decided on the client.
  const showdownRows = result
    ? buildShowdownRows({
        showdown: result.showdown ?? [],
        community: hand?.community ?? [],
        players: state.players,
        result,
      })
    : [];
  const showdownBySeat = new Map<number, ShowdownRow>(showdownRows.map((r) => [r.seat, r]));
  const headline = result ? describeWinnerHeadline(showdownRows, result, state.players) : '';

  const [feltTheme, setFeltTheme] = useState(() => loadFeltTheme());
  const [themesOpen, setThemesOpen] = useState(false);

  return (
    <section className="mesa-table">
      <header className="mesa-head">
        <div>
          <h1>{state.config.name}</h1>
          <p className="muted">Mesa · solo información pública</p>
        </div>
        <button type="button" className="ghost small" onClick={() => setThemesOpen(true)}>
          Temas
        </button>
      </header>

      <div
        className="mesa-oval"
        style={
          { '--felt-green': feltTheme.green, '--felt-dark': feltTheme.dark } as CSSProperties
        }
      >
        <div className="mesa-center">
          <CommunityRow
            cards={hand?.community ?? []}
            size="lg"
            max={5}
            pad={!handOver}
            halfScale={1.5}
          />

          <div className="mesa-pots">
            <p className="mesa-pot-label">
              {pots.length > 1 ? 'Bote total' : potLabel(0)}
            </p>
            <strong className="mesa-pot-amount">{formatChips(potTotal)}</strong>
            {pots.length > 1 ? (
              <div className="mesa-sidepots">
                {pots.map((pot, i) => (
                  <span key={i} className="mesa-sidepot">
                    {potLabel(i)} <b>{formatChips(pot.amount)}</b>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <p className="mesa-phase">Fase: {streetLabel(hand?.phase ?? state.phase)}</p>
          {headline ? <p className="mesa-headline">{headline}</p> : null}
        </div>

        {seats.map((p, i) => {
          const spot = ring[i];
          const shown = p.seat !== null ? showdownBySeat.get(p.seat) : undefined;
          const acting = hand?.currentToAct === p.seat;
          const folded = p.status === 'FOLDED';
          return (
            <div
              key={p.playerId}
              className={`mesa-seat${acting ? ' acting' : ''}${folded ? ' folded' : ''}${
                shown ? ' showing' : ''
              }${shown?.isWinner ? ' winner' : ''}`}
              style={spot ? { left: `${spot.xPct}%`, top: `${spot.yPct}%` } : undefined}
            >
              <span className="mesa-avatar" aria-hidden="true">
                {p.avatar ?? '👤'}
              </span>
              <div className="mesa-seat-main">
                {/* Kept out of the name span: that one ellipsises, and it was
                    swallowing the badge whenever the name ran long. */}
                <span className="mesa-seat-name">{p.displayName}</span>
                {p.seat !== null && hand?.button === p.seat ? (
                  <span className="dealer-badge" title="Dealer">
                    DEALER
                  </span>
                ) : null}
                <strong className="mesa-seat-stack">{formatChips(p.stack)}</strong>
                {shown ? (
                  <span className="mesa-seat-hand">
                    <span className="cards">
                      {shown.cards.map((card, ci) => (
                        <PlayingCard key={ci} card={card} size="sm" animate="reveal" />
                      ))}
                    </span>
                    <span className="mesa-seat-handname">{shown.categoryLabel}</span>
                    {shown.payout > 0 ? (
                      <span className="mesa-seat-payout">+{formatChips(shown.payout)}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div className={`mesa-seat-bet${p.status === 'ALL_IN' ? ' is-allin' : ''}`}>
                <span className="mesa-seat-bet-label">
                  {p.status === 'ALL_IN' ? 'All-in' : 'Apuesta'}
                </span>
                <span className="mesa-seat-bet-amount">{formatChips(p.betThisRound ?? 0)}</span>
              </div>
            </div>
          );
        })}

        {/* The dealer button itself, sitting on the felt like on a real table. */}
        {buttonSpot ? (
          <span
            className="mesa-button-puck"
            title="Botón del dealer"
            style={{ left: `${buttonSpot.xPct}%`, top: `${buttonSpot.yPct}%` }}
          >
            D
          </span>
        ) : null}
      </div>

      <ThemeModal
        open={themesOpen}
        feltThemeId={feltTheme.id}
        onFeltTheme={(id) => {
          setFeltTheme(resolveFeltTheme(id));
          saveFeltTheme(id);
        }}
        {...(onOpenThemes ? { onOpenThemes } : {})}
        onClose={() => setThemesOpen(false)}
      />
    </section>
  );
}
