import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicRoomState, WsServerEvent } from '@poker/shared';
import { connectWs, type ConnectionStatus, type WsHandle } from './net/wsClient';
import { clearSession, loadSession, saveSession } from './net/session';
import { UserGate } from './features/UserGate';
import { Home } from './features/Home';
import { CreateRoom } from './features/CreateRoom';
import { JoinRoom } from './features/JoinRoom';
import { Lobby } from './features/Lobby';
import { PlayerView } from './features/PlayerView';
import { TableView } from './features/TableView';
import { ThemeSettings } from './cards/ThemeSettings';

type Screen =
  | 'user'
  | 'home'
  | 'create'
  | 'join'
  | 'mesa-join'
  | 'lobby'
  | 'play'
  | 'table'
  | 'themes';

type User = { displayName: string; avatar: string };

function joinRoomIdFromPath(): string | undefined {
  const m = window.location.pathname.match(/^\/join\/([^/]+)/);
  return m?.[1];
}

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [screen, setScreen] = useState<Screen>('user');
  const [user, setUser] = useState<User | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [themesReturn, setThemesReturn] = useState<Screen>('home');
  const wsRef = useRef<WsHandle | null>(null);
  const resumeAttempted = useRef(false);
  const prefill = useMemo(() => joinRoomIdFromPath(), []);

  const openThemes = (from: Screen) => {
    setThemesReturn(from);
    setScreen('themes');
  };

  const onEvent = useCallback((event: WsServerEvent) => {
    switch (event.type) {
      case 'error':
        setError(`${event.code}: ${event.message}`);
        setBusy(false);
        if (event.code === 'INVALID_TOKEN' || event.code === 'ROOM_NOT_FOUND') {
          clearSession();
        }
        if (event.code === 'KICKED') {
          clearSession();
          setRoomState(null);
          setScreen('home');
        }
        break;
      case 'room:created':
        saveSession(event.token, event.playerId, event.roomId);
        setPlayerId(event.playerId);
        setRole('host');
        setBusy(false);
        setError('');
        setScreen('lobby');
        break;
      case 'room:joined':
        saveSession(event.token, event.playerId, event.roomId);
        setPlayerId(event.playerId);
        setRole(event.role);
        setBusy(false);
        setError('');
        setScreen(event.role === 'mesa' ? 'table' : 'lobby');
        break;
      case 'session:resumed':
        setPlayerId(event.playerId);
        setRole(event.role);
        setScreen(event.role === 'mesa' ? 'table' : 'lobby');
        break;
      case 'state:snapshot':
      case 'state:patch':
        setRoomState(event.roomState);
        if (event.roomState.phase === 'IN_HAND' && role !== 'mesa' && screen !== 'table') {
          setScreen('play');
        }
        if (event.roomState.phase === 'LOBBY' && role === 'mesa') {
          setScreen('table');
        }
        if (
          event.roomState.phase === 'LOBBY' &&
          role !== 'mesa' &&
          (screen === 'play' || !event.roomState.hand)
        ) {
          // stay in play briefly to show result, or go lobby
          if (!event.roomState.hand || event.roomState.hand.phase === 'COMPLETE') {
            // keep play view if lastResult present else lobby
            if (event.roomState.lastResult) setScreen('play');
            else if (role) setScreen(role === 'mesa' ? 'table' : 'lobby');
          }
        }
        break;
      case 'hand:dealt':
        setRoomState((prev) =>
          prev?.hand
            ? { ...prev, hand: { ...prev.hand, yourCards: event.yourCards } }
            : prev,
        );
        if (role !== 'mesa') setScreen('play');
        break;
      case 'hand:community':
        setRoomState((prev) =>
          prev?.hand
            ? {
                ...prev,
                hand: { ...prev.hand, community: event.cards, phase: event.phase },
              }
            : prev,
        );
        break;
      case 'hand:result':
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                lastResult: { winners: event.winners, payouts: event.payouts },
              }
            : prev,
        );
        break;
      default:
        break;
    }
  }, [role, screen]);

  // onEvent changes identity whenever role/screen change. The socket must not:
  // depending on it here tore down a live connection on every screen change,
  // and the resume it triggered changed the screen again — a reconnect loop.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const handle = connectWs({
      onStatus: setStatus,
      onEvent: (event) => onEventRef.current(event),
      onOpen: () => {
        // Auto session:resume on every (re)connect with backoff
        const session = loadSession();
        if (session) {
          resumeAttempted.current = true;
          handle.send({ type: 'session:resume', token: session.token });
        }
      },
    });
    wsRef.current = handle;
    return () => handle.close();
  }, []);

  const send = (event: Parameters<WsHandle['send']>[0]) => {
    setError('');
    wsRef.current?.send(event);
  };

  if (!user && screen === 'user') {
    return (
      <main className="app">
        <Conn status={status} />
        <UserGate
          onReady={(u) => {
            setUser(u);
            setScreen(prefill ? 'join' : 'home');
          }}
        />
      </main>
    );
  }

  return (
    <main className="app">
      <Conn status={status} />
      {screen === 'home' && (
        <>
          <Home
            joinPrefill={prefill}
            onCreate={() => setScreen('create')}
            onJoin={() => setScreen('join')}
            onMesa={() => setScreen('mesa-join')}
          />
          <button type="button" className="ghost" onClick={() => openThemes('home')}>
            Ajustes de cartas / temas
          </button>
        </>
      )}
      {screen === 'themes' && (
        <ThemeSettings onClose={() => setScreen(themesReturn)} />
      )}
      {screen === 'create' && user && (
        <CreateRoom
          busy={busy}
          error={error}
          onSubmit={({ password, config }) => {
            setBusy(true);
            send({
              type: 'room:create',
              password,
              user: { displayName: user.displayName, avatar: user.avatar },
              config,
            });
          }}
        />
      )}
      {(screen === 'join' || screen === 'mesa-join') && user && (
        <JoinRoom
          mode={screen === 'mesa-join' ? 'mesa' : 'player'}
          prefillRoomId={prefill}
          busy={busy}
          error={error}
          onSubmit={({ roomIdOrCode, password }) => {
            setBusy(true);
            const isId = roomIdOrCode.startsWith('room_');
            if (screen === 'mesa-join') {
              send({
                type: 'mesa:attach',
                password,
                ...(isId ? { roomId: roomIdOrCode } : { code: roomIdOrCode.toUpperCase() }),
              });
            } else {
              send({
                type: 'room:join',
                password,
                user: { displayName: user.displayName, avatar: user.avatar },
                ...(isId ? { roomId: roomIdOrCode } : { code: roomIdOrCode.toUpperCase() }),
              });
            }
          }}
        />
      )}
      {screen === 'lobby' && roomState && playerId && (
        <Lobby
          state={roomState}
          playerId={playerId}
          onStart={() => send({ type: 'hand:start' })}
          onLeave={() => {
            send({ type: 'player:leave' });
            clearSession();
            setRoomState(null);
            setScreen('home');
          }}
          onKick={(id) => send({ type: 'player:kick', playerId: id })}
          onRebuy={() => send({ type: 'player:rebuy' })}
        />
      )}
      {screen === 'play' && roomState && playerId && role !== 'mesa' && (
        <>
          <PlayerView
            state={roomState}
            playerId={playerId}
            onOpenThemes={() => openThemes('play')}
            onAction={(action, amount) => {
              if (!roomState.hand) return;
              send({
                type: 'player:action',
                handId: roomState.hand.handId,
                action,
                amount,
                clientActionId: crypto.randomUUID(),
              });
            }}
          />
          {roomState.phase === 'LOBBY' ? (
            <button type="button" className="primary" onClick={() => setScreen('lobby')}>
              Volver al lobby
            </button>
          ) : null}
        </>
      )}
      {(screen === 'table' || role === 'mesa') && roomState && role === 'mesa' && (
        <TableView state={roomState} onOpenThemes={() => openThemes('table')} />
      )}
      {error && screen !== 'create' && screen !== 'join' ? (
        <p className="error banner">{error}</p>
      ) : null}
    </main>
  );
}

function Conn({ status }: { status: ConnectionStatus }) {
  return (
    <div className="conn" role="status">
      <span className={`dot ${status}`} />
      {status}
    </div>
  );
}
