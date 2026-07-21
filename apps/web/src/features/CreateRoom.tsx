import { useState } from 'react';
import type { RoomConfig } from '@poker/shared';

export type CreateRoomSubmit = {
  password: string;
  config: Partial<RoomConfig>;
};

const PASSWORD_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** 6 random uppercase letters (matches room password format). */
function generateRoomPassword(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += PASSWORD_LETTERS[bytes[i]! % PASSWORD_LETTERS.length];
  }
  return out;
}

export function CreateRoom({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (data: CreateRoomSubmit) => void;
  busy?: boolean;
  error?: string;
}) {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Poker Night');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [mode, setMode] = useState<'cash' | 'tournament'>('cash');
  const [startingStack, setStartingStack] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [allowRebuy, setAllowRebuy] = useState(true);
  const [rebuyMax, setRebuyMax] = useState(3);
  const [turnSec, setTurnSec] = useState(30);
  const [timeBankSec, setTimeBankSec] = useState(60);
  const [doubleMinimum, setDoubleMinimum] = useState(false);

  // Empty = open room; otherwise exactly 6 letters.
  const valid = password === '' || /^[A-Za-z]{6}$/.test(password);

  return (
    <section className="panel">
      <h2>Crear sala</h2>
      <label className="field">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        Contraseña (opcional, 6 letras)
        <div className="field-row">
          <input
            value={password}
            maxLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Vacía = sin contraseña"
            autoCapitalize="off"
            autoComplete="off"
          />
          <button
            type="button"
            className="secondary"
            onClick={() => setPassword(generateRoomPassword())}
          >
            Generar
          </button>
        </div>
      </label>
      {!valid && password.length > 0 ? (
        <p className="error">Vacía o exactamente 6 letras A–Z (sin números ni símbolos)</p>
      ) : null}

      <label className="field">
        Modalidad
        <select
          value={mode}
          onChange={(e) => {
            const m = e.target.value as 'cash' | 'tournament';
            setMode(m);
            if (m === 'tournament') setAllowRebuy(false);
            else setAllowRebuy(true);
          }}
        >
          <option value="cash">Cash game (blinds fijas + rebuy)</option>
          <option value="tournament">Torneo (blinds progresivas)</option>
        </select>
      </label>

      <div className="config-grid">
        <label className="field">
          Máx. jugadores (2–9)
          <input
            type="number"
            min={2}
            max={9}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Stack inicial
          <input
            type="number"
            min={100}
            value={startingStack}
            onChange={(e) => setStartingStack(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Small blind
          <input
            type="number"
            min={1}
            value={smallBlind}
            onChange={(e) => setSmallBlind(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Big blind
          <input
            type="number"
            min={1}
            value={bigBlind}
            onChange={(e) => setBigBlind(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Timer turno (s, 0=∞)
          <input
            type="number"
            min={0}
            value={turnSec}
            onChange={(e) => setTurnSec(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Time bank (s)
          <input
            type="number"
            min={0}
            value={timeBankSec}
            onChange={(e) => setTimeBankSec(Number(e.target.value))}
          />
        </label>
      </div>

      {mode === 'cash' ? (
        <div className="config-grid">
          <label className="check">
            <input
              type="checkbox"
              checked={allowRebuy}
              onChange={(e) => setAllowRebuy(e.target.checked)}
            />
            Permitir recompra
          </label>
          <label className="field">
            Máx. recompras
            <input
              type="number"
              min={0}
              max={20}
              value={rebuyMax}
              disabled={!allowRebuy}
              onChange={(e) => setRebuyMax(Number(e.target.value))}
            />
          </label>
        </div>
      ) : (
        <p className="muted">
          Torneo: blinds suben cada ~5 min (estructura por defecto). Sin recompra. Eliminación a
          stack 0.
        </p>
      )}

      <label className="check">
        <input
          type="checkbox"
          checked={doubleMinimum}
          onChange={(e) => setDoubleMinimum(e.target.checked)}
        />
        Doblar el mínimo (apuesta mínima = 2× BB)
      </label>

      {error ? <p className="error">{error}</p> : null}
      <button
        type="button"
        className="primary"
        disabled={!valid || busy}
        onClick={() =>
          onSubmit({
            password,
            config: {
              name,
              maxPlayers,
              mode,
              startingStack,
              smallBlind,
              bigBlind,
              allowRebuy: mode === 'cash' && allowRebuy,
              rebuyMax,
              turnTimeoutMs: turnSec * 1000,
              timeBankMs: timeBankSec * 1000,
              doubleMinimum,
            },
          })
        }
      >
        Crear
      </button>
    </section>
  );
}
