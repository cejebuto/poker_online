import { useState } from 'react';

export function JoinRoom({
  mode,
  prefillRoomId,
  onSubmit,
  busy,
  error,
}: {
  mode: 'player' | 'mesa';
  prefillRoomId?: string;
  onSubmit: (data: { roomIdOrCode: string; password: string }) => void;
  busy?: boolean;
  error?: string;
}) {
  const [roomIdOrCode, setRoomIdOrCode] = useState(prefillRoomId ?? '');
  const [password, setPassword] = useState('');
  const valid = /^[A-Za-z]{6}$/.test(password);

  return (
    <section className="panel">
      <h2>{mode === 'mesa' ? 'Modo Mesa' : 'Unirse a sala'}</h2>
      <label className="field">
        Código o Room ID
        <input
          value={roomIdOrCode}
          onChange={(e) => setRoomIdOrCode(e.target.value)}
          placeholder="ABCXYZ o room_…"
        />
      </label>
      <label className="field">
        Contraseña (6 letras)
        <input
          value={password}
          maxLength={6}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ABCDEF"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button
        type="button"
        className="primary"
        disabled={!valid || !roomIdOrCode.trim() || busy}
        onClick={() => onSubmit({ roomIdOrCode: roomIdOrCode.trim(), password })}
      >
        Entrar
      </button>
    </section>
  );
}
