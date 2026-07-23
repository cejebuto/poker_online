import { useId, useState } from 'react';
import type { RoomConfig } from '@poker/shared';

export type CreateRoomSubmit = {
  password: string;
  config: Partial<RoomConfig>;
};

const PASSWORD_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const BLIND_PRESETS = [
  { sb: 5, bb: 10 },
  { sb: 10, bb: 25 },
  { sb: 25, bb: 50 },
  { sb: 50, bb: 100 },
] as const;

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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function CreateRoom({
  onSubmit,
  onBack,
  busy,
  error,
}: {
  onSubmit: (data: CreateRoomSubmit) => void;
  onBack?: () => void;
  busy?: boolean;
  error?: string;
}) {
  const nameId = useId();
  const pwdId = useId();
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Noche de póker');
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
  const canCreate = valid && name.trim().length > 0 && !busy;

  const applyBlindPreset = (sb: number, bb: number) => {
    setSmallBlind(sb);
    setBigBlind(bb);
  };

  const submit = () => {
    if (!canCreate) return;
    onSubmit({
      password,
      config: {
        name: name.trim(),
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
    });
  };

  return (
    <div className="create">
      <header className="create-top">
        <div className="create-top-main">
          {onBack ? (
            <button type="button" className="create-back" onClick={onBack}>
              ← Inicio
            </button>
          ) : null}
          <p className="create-eyebrow">NUEVA PARTIDA</p>
          <h1 className="create-title">Crear sala</h1>
        </div>
        <div className="create-summary" aria-label="Resumen de la mesa">
          <span className="create-summary-icon" aria-hidden>
            ♠
          </span>
          <div className="create-summary-text">
            <span className="create-summary-label">RESUMEN</span>
            <span className="create-summary-value">
              {maxPlayers}p · {smallBlind}/{bigBlind}
            </span>
          </div>
        </div>
      </header>

      <div className="create-scroll">
        <label className="create-field" htmlFor={nameId}>
          <span className="create-label">NOMBRE DE LA SALA</span>
          <input
            id={nameId}
            className="create-input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Noche de póker"
          />
        </label>

        <div className="create-field">
          <label className="create-label" htmlFor={pwdId}>
            CONTRASEÑA <span className="create-label-soft">· opcional</span>
          </label>
          <div className="create-pwd-row">
            <input
              id={pwdId}
              className="create-input"
              value={password}
              maxLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vacía = pública"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="create-gen"
              onClick={() => setPassword(generateRoomPassword())}
            >
              Generar
            </button>
          </div>
          {!valid && password.length > 0 ? (
            <p className="create-error">Vacía o exactamente 6 letras A–Z</p>
          ) : null}
        </div>

        <div className="create-field" role="group" aria-label="Modalidad">
          <span className="create-label">MODALIDAD</span>
          <div className="create-seg">
            <button
              type="button"
              className={mode === 'cash' ? 'create-seg-btn active' : 'create-seg-btn'}
              aria-pressed={mode === 'cash'}
              onClick={() => {
                setMode('cash');
                setAllowRebuy(true);
              }}
            >
              Cash game
            </button>
            <button
              type="button"
              className={mode === 'tournament' ? 'create-seg-btn active' : 'create-seg-btn'}
              aria-pressed={mode === 'tournament'}
              onClick={() => {
                setMode('tournament');
                setAllowRebuy(false);
              }}
            >
              Torneo
            </button>
          </div>
        </div>

        <div className="create-grid">
          <Stepper
            label="JUGADORES"
            value={maxPlayers}
            display={String(maxPlayers)}
            onDec={() => setMaxPlayers((n) => clamp(n - 1, 2, 9))}
            onInc={() => setMaxPlayers((n) => clamp(n + 1, 2, 9))}
          />
          <Stepper
            label="STACK INICIAL"
            value={startingStack}
            display={String(startingStack)}
            onDec={() => setStartingStack((n) => clamp(n - 100, 100, 100_000))}
            onInc={() => setStartingStack((n) => clamp(n + 100, 100, 100_000))}
          />
          <Stepper
            label="SMALL BLIND"
            value={smallBlind}
            display={String(smallBlind)}
            onDec={() => setSmallBlind((n) => clamp(n - 1, 1, bigBlind))}
            onInc={() => {
              const next = clamp(smallBlind + 1, 1, 10_000);
              setSmallBlind(next);
              if (next > bigBlind) setBigBlind(next);
            }}
          />
          <Stepper
            label="BIG BLIND"
            value={bigBlind}
            display={String(bigBlind)}
            onDec={() => setBigBlind((n) => clamp(n - 1, smallBlind, 20_000))}
            onInc={() => setBigBlind((n) => clamp(n + 1, smallBlind, 20_000))}
          />
          <Stepper
            label="TURNO"
            value={turnSec}
            display={turnSec === 0 ? '∞' : `${turnSec}s`}
            onDec={() => setTurnSec((n) => clamp(n - 5, 0, 300))}
            onInc={() => setTurnSec((n) => clamp(n + 5, 0, 300))}
          />
          <Stepper
            label="TIME BANK"
            value={timeBankSec}
            display={`${timeBankSec}s`}
            onDec={() => setTimeBankSec((n) => clamp(n - 10, 0, 600))}
            onInc={() => setTimeBankSec((n) => clamp(n + 10, 0, 600))}
          />
        </div>

        <div className="create-field" role="group" aria-label="Atajos de ciegas">
          <span className="create-label">ATAJOS DE CIEGAS</span>
          <div className="create-presets">
            {BLIND_PRESETS.map(({ sb, bb }) => {
              const active = smallBlind === sb && bigBlind === bb;
              return (
                <button
                  key={`${sb}-${bb}`}
                  type="button"
                  className={active ? 'create-preset active' : 'create-preset'}
                  aria-pressed={active}
                  onClick={() => applyBlindPreset(sb, bb)}
                >
                  {sb}/{bb}
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'cash' ? (
          <div className="create-toggle-row">
            <span className="create-toggle-label">Permitir recompra</span>
            <div className="create-toggle-controls">
              <div className="create-mini-step">
                <button
                  type="button"
                  className="create-step-btn"
                  disabled={!allowRebuy}
                  aria-label="Menos recompras"
                  onClick={() => setRebuyMax((n) => clamp(n - 1, 0, 20))}
                >
                  −
                </button>
                <span className="create-mini-val">{rebuyMax}</span>
                <button
                  type="button"
                  className="create-step-btn"
                  disabled={!allowRebuy}
                  aria-label="Más recompras"
                  onClick={() => setRebuyMax((n) => clamp(n + 1, 0, 20))}
                >
                  +
                </button>
              </div>
              <Toggle
                checked={allowRebuy}
                onChange={setAllowRebuy}
                label="Permitir recompra"
              />
            </div>
          </div>
        ) : (
          <p className="create-hint">
            Torneo: ciegas suben ~cada 5 min. Sin recompra. Eliminación a stack 0.
          </p>
        )}

        <div className="create-toggle-row">
          <span className="create-toggle-label">Apuesta mínima 2× BB</span>
          <Toggle
            checked={doubleMinimum}
            onChange={setDoubleMinimum}
            label="Apuesta mínima 2× BB"
          />
        </div>

        {error ? <p className="create-error banner">{error}</p> : null}
      </div>

      <footer className="create-footer">
        <button type="button" className="create-cta" disabled={!canCreate} onClick={submit}>
          {busy ? 'Creando…' : 'Crear sala'}
        </button>
      </footer>
    </div>
  );
}

function Stepper({
  label,
  value,
  display,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  display: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="create-stepper" data-value={value}>
      <span className="create-label">{label}</span>
      <div className="create-step-body">
        <button type="button" className="create-step-btn" aria-label={`${label} menos`} onClick={onDec}>
          −
        </button>
        <span className="create-step-val">{display}</span>
        <button type="button" className="create-step-btn" aria-label={`${label} más`} onClick={onInc}>
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'create-switch on' : 'create-switch'}
      onClick={() => onChange(!checked)}
    >
      <span className="create-switch-knob" />
    </button>
  );
}
