import { useMemo, useState } from 'react';
import type { RoomSummary } from '@poker/shared';
import { filterRooms, MAX_ACTIVE_ROOMS } from './roomFilter';
import { canDeleteRoomFromDirectory } from './roomDeleteEligibility';
import { ConfirmModal } from './ConfirmModal';

export function RoomBrowser({
  rooms,
  displayName,
  onPick,
  onRefresh,
  onDelete,
}: {
  rooms: RoomSummary[] | null;
  /** Current local display name — gates the admin delete control. */
  displayName: string;
  onPick: (room: RoomSummary, as: 'player' | 'mesa') => void;
  onRefresh: () => void;
  onDelete?: (room: RoomSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RoomSummary | null>(null);
  const visible = useMemo(() => filterRooms(rooms ?? [], query), [rooms, query]);

  return (
    <section className="home-card home-rooms" aria-labelledby="home-rooms-title">
      <div className="home-rooms-head">
        <h2 id="home-rooms-title" className="home-rooms-title">
          Mesas activas
        </h2>
        <button type="button" className="home-refresh" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      <input
        type="search"
        className="home-search"
        placeholder="Buscar por nombre o código"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar mesa"
      />

      {rooms === null ? (
        <p className="home-empty">Buscando mesas…</p>
      ) : rooms.length === 0 ? (
        <p className="home-empty">No hay mesas activas. Creá una.</p>
      ) : visible.length === 0 ? (
        <p className="home-empty">Ninguna mesa coincide con «{query}».</p>
      ) : (
        <ul className="home-room-list">
          {visible.map((room) => {
            const full = room.players >= room.maxPlayers;
            const canDelete = Boolean(onDelete) && canDeleteRoomFromDirectory(displayName, room);
            return (
              <li key={room.roomId} className="home-room">
                <OccupancyRing current={room.players} max={room.maxPlayers} full={full} />
                <div className="home-room-info">
                  <strong className="home-room-name">{room.name}</strong>
                  <span className="home-room-meta">
                    Ciegas {room.smallBlind}/{room.bigBlind} · {room.code}
                  </span>
                </div>
                <div className="home-room-actions">
                  <button
                    type="button"
                    className="home-room-enter"
                    disabled={full}
                    onClick={() => onPick(room, 'player')}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className="home-room-view"
                    onClick={() => onPick(room, 'mesa')}
                  >
                    Ver
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      className="home-room-delete"
                      onClick={() => setPendingDelete(room)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rooms !== null && rooms.length > 0 ? (
        <p className="home-rooms-cap" aria-hidden>
          Hasta {MAX_ACTIVE_ROOMS} mesas
        </p>
      ) : null}

      <ConfirmModal
        open={pendingDelete !== null}
        title="¿Eliminar mesa?"
        message={
          pendingDelete
            ? `Vas a eliminar «${pendingDelete.name}» (${pendingDelete.code}). Se expulsa al jugador y la mesa desaparece.`
            : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const room = pendingDelete;
          setPendingDelete(null);
          if (room) onDelete?.(room);
        }}
      />
    </section>
  );
}

function OccupancyRing({
  current,
  max,
  full,
}: {
  current: number;
  max: number;
  full: boolean;
}) {
  const size = 40;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, current / max) : 0;
  const offset = c * (1 - ratio);
  const label = `${current}/${max}`;

  return (
    <div
      className={full ? 'home-ring home-ring--full' : 'home-ring'}
      aria-label={`${current} de ${max} jugadores`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="rgba(6,18,12,0.55)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={full ? '#d4b06a' : '#c9b07a'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="home-ring-label">{label}</span>
    </div>
  );
}
