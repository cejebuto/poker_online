import { useState } from 'react';

const AVATARS = ['🃏', '🎩', '🦊', '🐉', '🍀', '⭐'];

export function UserGate({
  onReady,
}: {
  onReady: (user: { displayName: string; avatar: string }) => void;
}) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);

  return (
    <section className="panel">
      <h2>¿Quién sos?</h2>
      <p className="muted">Nombre y avatar (sin cuenta)</p>
      <label className="field">
        Nombre
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu apodo"
        />
      </label>
      <div className="avatar-row">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            className={a === avatar ? 'avatar selected' : 'avatar'}
            onClick={() => setAvatar(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="primary"
        disabled={name.trim().length < 2}
        onClick={() => onReady({ displayName: name.trim(), avatar })}
      >
        Continuar
      </button>
    </section>
  );
}
