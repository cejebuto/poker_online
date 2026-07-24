import type { RoomSummary } from '@poker/shared';
import type { ConnectionStatus } from '../net/wsClient';
import { RoomBrowser } from './RoomBrowser';

const CONN_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando',
  connected: 'Conectado',
  disconnected: 'Desconectado',
};

export function Home({
  status,
  displayName,
  onCreate,
  onJoin,
  onMesa,
  joinPrefill,
  rooms,
  onPickRoom,
  onRefreshRooms,
  onDeleteRoom,
  onOpenThemes,
}: {
  status: ConnectionStatus;
  displayName: string;
  onCreate: () => void;
  onJoin: () => void;
  onMesa: () => void;
  joinPrefill?: string;
  rooms: RoomSummary[] | null;
  onPickRoom: (room: RoomSummary, as: 'player' | 'mesa') => void;
  onRefreshRooms: () => void;
  onDeleteRoom?: (room: RoomSummary) => void;
  onOpenThemes?: () => void;
}) {
  return (
    <div className="home">
      <header className="home-top">
        <div className={`home-conn home-conn--${status}`} role="status">
          <span className={`dot ${status}`} aria-hidden />
          {CONN_LABEL[status]}
        </div>
        <p className="home-brand">TEXAS HOLD&apos;EM · NO-LIMIT</p>
      </header>

      <section className="home-card home-hero" aria-labelledby="home-title">
        <h1 id="home-title" className="home-title">
          Póker con amigos
        </h1>
        <p className="home-sub">Salas privadas · una mano entre conocidos</p>
        {joinPrefill ? (
          <p className="home-invite">Invitación a sala: {joinPrefill}</p>
        ) : null}

        <button type="button" className="home-cta" onClick={onCreate}>
          Crear sala nueva
        </button>
        <div className="home-secondary">
          <button type="button" className="home-btn" onClick={onJoin}>
            Unirse con código
          </button>
          <button type="button" className="home-btn home-btn--outline" onClick={onMesa}>
            Entrar para ver
          </button>
        </div>
      </section>

      <RoomBrowser
        rooms={rooms}
        displayName={displayName}
        onPick={onPickRoom}
        onRefresh={onRefreshRooms}
        onDelete={onDeleteRoom}
      />

      {onOpenThemes ? (
        <button type="button" className="home-themes" onClick={onOpenThemes}>
          Ajustes de cartas / temas
        </button>
      ) : null}
    </div>
  );
}
