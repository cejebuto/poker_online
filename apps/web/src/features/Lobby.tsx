import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';
import type { PublicPlayer, PublicRoomState } from '@poker/shared';
import { NextHandPrompt } from './NextHandPrompt';
import { canPlayerRebuy } from './rebuy';
import { SEAT_CHIPS, SeatChip, seatChipByToken } from './SeatChip';

export function Lobby({
  state,
  playerId,
  onStart,
  onReady,
  onLeave,
  onKick,
  onRebuy,
  autoNextHand = false,
}: {
  state: PublicRoomState;
  playerId: string;
  onStart: () => void;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
  onKick: (id: string) => void;
  onRebuy?: () => void;
  autoNextHand?: boolean;
}) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const isHost = state.hostPlayerId === playerId;
  const seated = state.players.filter((p) => p.role !== 'mesa');
  const mesaOnline = state.players.some((p) => p.role === 'mesa' && p.connected);
  const readyToDeal =
    state.phase === 'LOBBY' &&
    seated.filter((p) => (p.stack ?? 0) > 0 && p.status !== 'ELIMINATED').length >= 2;
  /** First deal: host CTA only. After handsPlayed, server sends nextHand. */
  const firstHandLobby = state.phase === 'LOBBY' && !state.nextHand;
  const canStart = isHost && firstHandLobby && readyToDeal;
  const canRebuy = Boolean(onRebuy) && canPlayerRebuy(state, playerId);
  /** Ready-up prompt — only when the server exposes nextHand (post first hand). */
  const betweenHands = Boolean(state.nextHand) && state.phase === 'LOBBY';

  const copy = async (kind: 'code' | 'link', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <div className="lobby">
      <header className="lobby-top">
        <div className="lobby-top-main">
          <p className="lobby-eyebrow">
            {state.config.mode === 'tournament' ? 'TORNEO' : 'CASH GAME'} · LOBBY
          </p>
          <h1 className="lobby-title">{state.config.name}</h1>
          <p className="lobby-sub">
            Ciegas {state.effectiveSmallBlind}/{state.effectiveBigBlind}
            {state.config.doubleMinimum ? ' · mín. 2×BB' : ''}
            {' · '}stack {state.config.startingStack}
            {state.config.mode === 'cash' && state.config.allowRebuy
              ? ` · rebuy ×${state.config.rebuyMax ?? 0}`
              : ''}
          </p>
        </div>
        <div className="lobby-seats-badge" aria-label="Asientos ocupados">
          <span className="lobby-seats-count">
            {seated.length}/{state.config.maxPlayers}
          </span>
          <span className="lobby-seats-label">asientos</span>
        </div>
      </header>

      <div className="lobby-scroll">
        <section className="lobby-card lobby-invite" aria-label="Invitar a la mesa">
          <div className="lobby-code-block">
            <span className="lobby-label">CÓDIGO</span>
            <p className="lobby-code">{state.code}</p>
          </div>

          <div className="lobby-actions" role="group" aria-label="Compartir sala">
            <button
              type="button"
              className="lobby-action"
              onClick={() => void copy('code', state.code)}
            >
              {copied === 'code' ? 'Código ✓' : 'Copiar código'}
            </button>
            <button type="button" className="lobby-action lobby-action--gold" onClick={() => setQrOpen(true)}>
              QR
            </button>
            <button
              type="button"
              className="lobby-action"
              onClick={() => void copy('link', state.joinUrl)}
            >
              {copied === 'link' ? 'Link ✓' : 'Copiar link'}
            </button>
          </div>

          <p className="lobby-link" title={state.joinUrl}>
            {state.joinUrl}
          </p>

          {mesaOnline ? (
            <p className="lobby-mesa-note">Mesa compartida conectada</p>
          ) : (
            <p className="lobby-mesa-note muted">Sin dispositivo mesa</p>
          )}
        </section>

        {state.tournament ? (
          <section className="lobby-card lobby-tournament">
            <strong>
              Nivel {state.tournament.levelIndex + 1}: {state.tournament.smallBlind}/
              {state.tournament.bigBlind}
            </strong>
            {state.tournament.nextBigBlind ? (
              <span className="lobby-meta">
                {' '}
                · siguiente {state.tournament.nextSmallBlind}/{state.tournament.nextBigBlind}
              </span>
            ) : null}
            {state.tournament.levelEndsAt ? (
              <span className="lobby-meta">
                {' '}
                · sube ~
                {Math.max(0, Math.ceil((state.tournament.levelEndsAt - Date.now()) / 60_000))} min
              </span>
            ) : null}
            <div className="lobby-meta">Restan {state.tournament.playersRemaining} jugadores</div>
            {state.tournament.finished ? (
              <div className="lobby-result">
                Torneo finalizado ·{' '}
                {state.tournament.ranking
                  .slice(0, 3)
                  .map((r) => `#${r.place} ${r.displayName}`)
                  .join(' · ')}
              </div>
            ) : null}
          </section>
        ) : null}

        {state.phase === 'FINISHED' ? (
          <p className="lobby-result-banner">Partida finalizada</p>
        ) : null}

        <section className="lobby-card lobby-players" aria-labelledby="lobby-players-title">
          <div className="lobby-players-head">
            <h2 id="lobby-players-title" className="lobby-section-title">
              En la mesa
            </h2>
            <span className="lobby-meta">
              {seated.filter((p) => p.connected).length} online
            </span>
          </div>

          {seated.length === 0 ? (
            <p className="lobby-empty">Nadie sentado todavía.</p>
          ) : (
            <ul className="lobby-player-list">
              {seated.map((p) => (
                <PlayerRow
                  key={p.playerId}
                  player={p}
                  isMe={p.playerId === playerId}
                  isHostSeat={p.playerId === state.hostPlayerId}
                  showReady={betweenHands}
                  canKick={isHost && p.playerId !== playerId && p.status !== 'ELIMINATED'}
                  onKick={() => onKick(p.playerId)}
                />
              ))}
            </ul>
          )}
        </section>

        {betweenHands ? (
          <div className="lobby-next-wrap">
            <NextHandPrompt
              state={state}
              playerId={playerId}
              autoNextHand={autoNextHand}
              onReady={onReady}
              onForceStart={onStart}
              onRebuy={onRebuy}
            />
          </div>
        ) : null}
      </div>

      <footer className="lobby-footer">
        {canStart ? (
          <button type="button" className="lobby-cta" onClick={onStart}>
            Empezar a Jugar
          </button>
        ) : isHost && firstHandLobby && !readyToDeal ? (
          <p className="lobby-waiting">Faltan jugadores para empezar…</p>
        ) : firstHandLobby && !isHost ? (
          <p className="lobby-waiting">Esperando al host…</p>
        ) : null}

        <div className="lobby-footer-row">
          {canRebuy && !betweenHands ? (
            <button type="button" className="lobby-btn-gold" onClick={onRebuy}>
              Recomprar
            </button>
          ) : null}
          <button type="button" className="lobby-btn-ghost" onClick={onLeave}>
            Salir
          </button>
        </div>
      </footer>

      <JoinQrModal
        open={qrOpen}
        joinUrl={state.joinUrl}
        code={state.code}
        roomName={state.config.name}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}

function JoinQrModal({
  open,
  joinUrl,
  code,
  roomName,
  onClose,
}: {
  open: boolean;
  joinUrl: string;
  code: string;
  roomName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setDataUrl(null);
    void QRCode.toDataURL(joinUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0c1f16', light: '#f7f3ea' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo generar el QR');
      });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, joinUrl, onClose]);

  if (!open) return null;

  return (
    <div className="lobby-qr-root" role="presentation">
      <button type="button" className="lobby-qr-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div
        className="lobby-qr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className="lobby-qr-eyebrow">ESCANEÁ PARA ENTRAR</p>
        <h2 id={titleId} className="lobby-qr-title">
          {roomName}
        </h2>
        <p className="lobby-qr-code">{code}</p>
        <div className="lobby-qr-frame">
          {dataUrl ? (
            <img src={dataUrl} alt={`Código QR de la sala ${code}`} width={280} height={280} />
          ) : error ? (
            <p className="lobby-qr-error">{error}</p>
          ) : (
            <p className="lobby-qr-loading">Generando…</p>
          )}
        </div>
        <p className="lobby-qr-hint">Abre la cámara y apunta al código para unirte a la sala.</p>
        <button type="button" className="lobby-qr-close" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  isMe,
  isHostSeat,
  showReady,
  canKick,
  onKick,
}: {
  player: PublicPlayer;
  isMe: boolean;
  isHostSeat: boolean;
  showReady: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  const offline = !player.connected;
  const eliminated = player.status === 'ELIMINATED';

  return (
    <li
      className={[
        'lobby-player',
        isMe ? 'lobby-player--me' : '',
        offline ? 'lobby-player--offline' : '',
        eliminated ? 'lobby-player--out' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PlayerAvatar token={player.avatar} />
      <div className="lobby-player-info">
        <div className="lobby-player-name-row">
          <strong className="lobby-player-name">
            {player.displayName}
            {isMe ? ' (vos)' : ''}
          </strong>
          {isHostSeat ? <span className="lobby-host-pill">HOST</span> : null}
          {showReady && player.ready ? <span className="lobby-ready-pill">LISTO</span> : null}
        </div>
        <span className="lobby-player-meta">
          Asiento {player.seat ?? '—'} · {player.stack.toLocaleString()} fichas
          {player.rebuyCount ? ` · rebuy ${player.rebuyCount}` : ''}
          {player.finishPlace ? ` · #${player.finishPlace}` : ''}
          {offline ? ' · offline' : ''}
          {eliminated ? ' · eliminado' : ''}
        </span>
      </div>
      {canKick ? (
        <button type="button" className="lobby-kick" onClick={onKick}>
          Expulsar
        </button>
      ) : null}
    </li>
  );
}

function PlayerAvatar({ token }: { token?: string }) {
  const known = token && SEAT_CHIPS.some((c) => c.token === token);
  if (known && token) {
    return (
      <span className="lobby-avatar">
        <SeatChip chip={seatChipByToken(token)} size={36} selected />
      </span>
    );
  }
  return (
    <span className="lobby-avatar lobby-avatar--fallback" aria-hidden>
      {token && token.length <= 4 ? token : '♠'}
    </span>
  );
}
