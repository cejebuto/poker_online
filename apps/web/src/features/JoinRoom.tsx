import { useId, useState, type FormEvent } from 'react';

export function JoinRoom({
  mode,
  prefillRoomId,
  onSubmit,
  onBack,
  busy,
  error,
}: {
  mode: 'player' | 'mesa';
  prefillRoomId?: string;
  onSubmit: (data: { roomIdOrCode: string; password: string }) => void;
  onBack?: () => void;
  busy?: boolean;
  error?: string;
}) {
  const codeId = useId();
  const pwdId = useId();
  const [roomIdOrCode, setRoomIdOrCode] = useState(prefillRoomId ?? '');
  const [password, setPassword] = useState('');
  // Empty for open rooms; otherwise exactly 6 letters.
  const validPwd = password === '' || /^[A-Za-z]{6}$/.test(password);
  const code = roomIdOrCode.trim();
  const canSubmit = validPwd && code.length > 0 && !busy;

  const isMesa = mode === 'mesa';

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ roomIdOrCode: code, password });
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="join">
      <header className="join-top">
        {onBack ? (
          <button type="button" className="join-back" onClick={onBack}>
            ← Inicio
          </button>
        ) : null}
        <p className="join-eyebrow">{isMesa ? 'MODO MESA' : 'ENTRAR A LA PARTIDA'}</p>
        <h1 className="join-title">{isMesa ? 'Entrar para ver' : 'Unirse a la sala'}</h1>
        <p className="join-sub">
          {isMesa
            ? 'Conectá este dispositivo como mesa compartida. No ocupa un asiento.'
            : 'Ingresá el código de la sala (o el link) y la contraseña si tiene.'}
        </p>
      </header>

      <form className="join-card" onSubmit={onFormSubmit}>
        <label className="join-field" htmlFor={codeId}>
          <span className="join-label">CÓDIGO O ROOM ID</span>
          <input
            id={codeId}
            className="join-input"
            value={roomIdOrCode}
            onChange={(e) => setRoomIdOrCode(e.target.value)}
            placeholder="ABCXYZ o room_…"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            autoFocus={!prefillRoomId}
          />
        </label>

        <label className="join-field" htmlFor={pwdId}>
          <span className="join-label">
            CONTRASEÑA <span className="join-label-soft">· si la sala tiene</span>
          </span>
          <input
            id={pwdId}
            className="join-input"
            value={password}
            maxLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Vacía si es pública"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>

        {!validPwd && password.length > 0 ? (
          <p className="join-error">Vacía o exactamente 6 letras A–Z</p>
        ) : null}

        {error ? <p className="join-error banner">{error}</p> : null}

        <button type="submit" className="join-cta" disabled={!canSubmit}>
          {busy ? 'Entrando…' : isMesa ? 'Conectar mesa' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
