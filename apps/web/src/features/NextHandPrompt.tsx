import type { PublicPlayer, PublicRoomState } from '@poker/shared';

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
 * Between hands: every seated player accepts before the next deal. The host keeps
 * an override so an absent player cannot freeze the table.
 */
export function NextHandPrompt({
  state,
  playerId,
  onReady,
  onForceStart,
}: {
  state: PublicRoomState;
  playerId: string;
  onReady: (ready: boolean) => void;
  onForceStart: () => void;
}) {
  const next = state.nextHand;
  if (!next || state.phase !== 'LOBBY') return null;

  const isHost = state.hostPlayerId === playerId;
  const me = state.players.find((p) => p.playerId === playerId);
  const waiting = pending(state.players);
  const iAmWaited = waiting.some((p) => p.playerId === playerId);
  const enoughPlayers = next.needed >= 2;

  return (
    <section className="next-hand">
      <div className="row between">
        <strong>¿Jugamos otra?</strong>
        <span className="meta">
          {next.ready}/{next.needed} listos
        </span>
      </div>

      {enoughPlayers ? null : (
        <p className="meta">Faltan jugadores con fichas para repartir.</p>
      )}

      {waiting.length && enoughPlayers ? (
        <p className="meta">
          Esperando a {waiting.map((p) => p.displayName).join(', ')}
        </p>
      ) : null}

      <div className="row">
        {me && iAmWaited ? (
          <button type="button" className="primary" onClick={() => onReady(true)}>
            Jugar otra
          </button>
        ) : me && me.ready ? (
          <button type="button" className="ghost" onClick={() => onReady(false)}>
            Listo ✓ · cancelar
          </button>
        ) : null}

        {isHost && enoughPlayers && waiting.length > 0 ? (
          <button type="button" className="ghost" onClick={onForceStart}>
            Empezar sin esperar
          </button>
        ) : null}
      </div>
    </section>
  );
}
