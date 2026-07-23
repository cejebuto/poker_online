import type { PublicPlayer, PublicRoomState } from '@poker/shared';
import { canPlayerRebuy } from './rebuy';

/** Mirrors the server's readiness filter: who still has to accept. */
function pending(players: PublicPlayer[]): PublicPlayer[] {
  return players.filter(
    (p) =>
      p.role !== 'mesa' &&
      p.seat !== null &&
      p.stack > 0 &&
      p.connected &&
      p.status !== 'SITTING_OUT' &&
      p.status !== 'ELIMINATED' &&
      !p.ready,
  );
}

/**
 * The table is waiting to deal again.
 *
 * Exported because Vista Mesa hands its whole card area over to this prompt, and
 * the two must never disagree about when that happens.
 */
export function isBetweenHands(state: PublicRoomState): boolean {
  return Boolean(state.nextHand) && state.phase === 'LOBBY';
}

/**
 * Between hands: every seated player accepts before the next deal. The host keeps
 * an override so an absent player cannot freeze the table.
 */
export function NextHandPrompt({
  state,
  playerId,
  onReady,
  onForceStart,
  onRebuy,
  autoNextHand = false,
}: {
  state: PublicRoomState;
  playerId: string;
  onReady: (ready: boolean) => void;
  onForceStart: () => void;
  onRebuy?: () => void;
  /** Host preference: next hand starts alone after ~2s. */
  autoNextHand?: boolean;
}) {
  const next = state.nextHand;
  if (!isBetweenHands(state) || !next) return null;

  const isHost = state.hostPlayerId === playerId;
  const me = state.players.find((p) => p.playerId === playerId);
  const waiting = pending(state.players);
  const iAmWaited = waiting.some((p) => p.playerId === playerId);
  const enoughPlayers = next.needed >= 2;
  const showRebuy = Boolean(onRebuy) && canPlayerRebuy(state, playerId);
  const autoDealing = autoNextHand && isHost && enoughPlayers;

  return (
    <section className="next-hand">
      <div className="row between">
        <strong>{autoDealing ? 'Siguiente mano…' : '¿Jugamos otra?'}</strong>
        <span className="meta">
          {autoDealing ? 'en 2s' : `${next.ready}/${next.needed} listos`}
        </span>
      </div>

      {enoughPlayers ? null : (
        <p className="meta">Faltan jugadores con fichas para repartir.</p>
      )}

      {autoDealing ? (
        <p className="meta">Partida automática: se reparte en 2 segundos.</p>
      ) : null}

      {showRebuy ? (
        <p className="meta">Te quedaste sin fichas. Recomprá para seguir jugando.</p>
      ) : null}

      {!autoDealing && waiting.length && enoughPlayers ? (
        <p className="meta">
          Esperando a {waiting.map((p) => p.displayName).join(', ')}
        </p>
      ) : null}

      <div className="row">
        {showRebuy ? (
          <button type="button" className="primary" onClick={onRebuy}>
            Recomprar
          </button>
        ) : null}

        {!autoDealing && me && iAmWaited ? (
          <button type="button" className="primary" onClick={() => onReady(true)}>
            Jugar otra
          </button>
        ) : null}
        {!autoDealing && me && me.ready ? (
          <button type="button" className="ghost" onClick={() => onReady(false)}>
            Listo ✓ · cancelar
          </button>
        ) : null}

        {!autoDealing && isHost && enoughPlayers && waiting.length > 0 ? (
          <button type="button" className="ghost" onClick={onForceStart}>
            Empezar sin esperar
          </button>
        ) : null}

        {autoDealing ? (
          <button type="button" className="ghost" onClick={onForceStart}>
            Repartir ya
          </button>
        ) : null}
      </div>
    </section>
  );
}
