import { useState } from 'react';

export function CreateRoom({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (data: { password: string; name: string; maxPlayers: number }) => void;
  busy?: boolean;
  error?: string;
}) {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Poker Night');
  const [maxPlayers, setMaxPlayers] = useState(6);

  const valid = /^[A-Za-z]{6}$/.test(password);

  return (
    <section className="panel">
      <h2>Crear sala</h2>
      <label className="field">
        Nombre de la sala
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        Contraseña (6 letras)
        <input
          value={password}
          maxLength={6}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ABCDEF"
          autoCapitalize="off"
        />
      </label>
      {!valid && password.length > 0 ? (
        <p className="error">Exactamente 6 letras A–Z (sin números ni símbolos)</p>
      ) : null}
      <label className="field">
        Máx. jugadores
        <input
          type="number"
          min={2}
          max={9}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button
        type="button"
        className="primary"
        disabled={!valid || busy}
        onClick={() => onSubmit({ password, name, maxPlayers })}
      >
        Crear
      </button>
    </section>
  );
}
