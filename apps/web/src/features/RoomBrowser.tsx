import { useMemo, useState } from 'react';
import type { RoomSummary } from '@poker/shared';
import { filterRooms } from './roomFilter';

export function RoomBrowser({
  rooms,
  onPick,
  onRefresh,
}: {
  rooms: RoomSummary[] | null;
  onPick: (room: RoomSummary, as: 'player' | 'mesa') => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterRooms(rooms ?? [], query), [rooms, query]);

  return (
    <section className="panel room-browser">
      <div className="row between">
        <h3>Mesas activas</h3>
        <button type="button" className="ghost small" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre o código"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar mesa"
      />

      {rooms === null ? (
        <p className="meta">Buscando mesas…</p>
      ) : rooms.length === 0 ? (
        <p className="meta">No hay mesas activas. Creá una.</p>
      ) : visible.length === 0 ? (
        <p className="meta">Ninguna mesa coincide con «{query}».</p>
      ) : (
        <ul className="room-list">
          {visible.map((room) => (
            <li key={room.roomId}>
              <div className="room-line">
                <strong>
                  {room.hasPassword ? '🔒' : '🔓'} {room.name}
                </strong>
                <span className="meta">
                  {room.code} · {room.players}/{room.maxPlayers} jugadores ·{' '}
                  {room.phase === 'IN_HAND' ? 'jugando' : 'en lobby'}
                </span>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="primary small"
                  disabled={room.players >= room.maxPlayers}
                  onClick={() => onPick(room, 'player')}
                >
                  {room.players >= room.maxPlayers ? 'Llena' : 'Entrar'}
                </button>
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => onPick(room, 'mesa')}
                >
                  Como mesa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
