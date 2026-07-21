import type { RoomSummary } from '@poker/shared';
import { RoomBrowser } from './RoomBrowser';

export function Home({
  onCreate,
  onJoin,
  onMesa,
  joinPrefill,
  rooms,
  onPickRoom,
  onRefreshRooms,
}: {
  onCreate: () => void;
  onJoin: () => void;
  onMesa: () => void;
  joinPrefill?: string;
  rooms: RoomSummary[] | null;
  onPickRoom: (room: RoomSummary, as: 'player' | 'mesa') => void;
  onRefreshRooms: () => void;
}) {
  return (
    <>
      <section className="panel">
        <h2>Poker con Amigos</h2>
        <p className="muted">Salas privadas · Texas Hold&apos;em No-Limit</p>
        {joinPrefill ? <p className="meta">Invitación a sala: {joinPrefill}</p> : null}
        <div className="stack">
          <button type="button" className="primary" onClick={onCreate}>
            Crear sala (Host)
          </button>
          <button type="button" onClick={onJoin}>
            Unirse con código
          </button>
          <button type="button" className="ghost" onClick={onMesa}>
            Entrar como Mesa
          </button>
        </div>
      </section>

      <RoomBrowser rooms={rooms} onPick={onPickRoom} onRefresh={onRefreshRooms} />
    </>
  );
}
