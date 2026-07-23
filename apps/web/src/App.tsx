import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicRoomState, RoomSummary, WsServerEvent } from '@poker/shared';
import { connectWs, type ConnectionStatus, type WsHandle } from './net/wsClient';
import { clearSession, loadSession, saveSession } from './net/session';
import { newClientActionId } from './net/id';
import { UserGate } from './features/UserGate';
import { Home } from './features/Home';
import { CreateRoom } from './features/CreateRoom';
import { JoinRoom } from './features/JoinRoom';
import { Lobby } from './features/Lobby';
import { PlayerView } from './features/PlayerView';
import { TableView } from './features/TableView';
import { describeAutoAction } from './features/handResult';
import { NextHandPrompt } from './features/NextHandPrompt';
import { backFor, needsLeaveConfirm, type Screen } from './features/navigation';
import { FeltView } from './features/FeltView';
import { describeAction } from './features/feltStats';
import { loadPlayViewMode, savePlayViewMode, type PlayViewMode } from './features/viewMode';
import { ThemeSettings } from './cards/ThemeSettings';

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
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [themesReturn, setThemesReturn] = useState<Screen>('home');
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [playView, setPlayView] = useState<PlayViewMode>(() => loadPlayViewMode());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [pickedRoom, setPickedRoom] = useState<string | undefined>(undefined);
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
      case 'rooms:listed':
        setRooms(event.rooms);
        break;
      case 'player:acted':
        setLastAction(describeAction(event.action, event.amount));
        break;
      case 'player:auto_acted': {
        const players = roomState?.players ?? [];
        const mySeat = players.find((p) => p.playerId === playerId)?.seat ?? null;
        setNotice(describeAutoAction(event, players, mySeat));
        setLastAction(describeAction(event.action, 0));
        break;
      }
      case 'hand:dealt':
        setRoomState((prev) =>
          prev?.hand
            ? { ...prev, hand: { ...prev.hand, yourCards: event.yourCards } }
            : prev,
        );
        setNotice('');
        setLastAction(null);
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
      case 'showdown:reveal':
        // The snapshot that follows carries the same cards; this only avoids the
        // gap between the reveal and that snapshot.
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                lastResult: {
                  winners: [],
                  payouts: {},
                  ...prev.lastResult,
                  showdown: event.hands,
                },
              }
            : prev,
        );
        break;
      case 'hand:result':
        setRoomState((prev) =>
          prev
            ? {
                ...prev,
                lastResult: {
                  ...prev.lastResult,
                  winners: event.winners,
                  payouts: event.payouts,
                },
              }
            : prev,
        );
        break;
      default:
        break;
    }
  }, [role, screen, playerId, roomState]);

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
        handle.send({ type: 'rooms:list' });
      },
    });
    wsRef.current = handle;
    return () => handle.close();
  }, []);

  const send = (event: Parameters<WsHandle['send']>[0]) => {
    setError('');
    wsRef.current?.send(event);
  };

  // Refresh the directory whenever the user lands back on the home screen.
  useEffect(() => {
    if (screen === 'home') wsRef.current?.send({ type: 'rooms:list' });
  }, [screen]);

  if (!user && screen === 'user') {
    return (
      <main className="app app-gate">
        <UserGate
          status={status}
          onReady={(u) => {
            setUser(u);
            setScreen(prefill ? 'join' : 'home');
          }}
        />
      </main>
    );
  }

  const switchPlayView = (mode: PlayViewMode) => {
    setPlayView(mode);
    savePlayViewMode(mode);
  };

  const sendPlayerAction = (
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in',
    amount?: number,
  ) => {
    if (!roomState?.hand) return;
    send({
      type: 'player:action',
      handId: roomState.hand.handId,
      action,
      amount,
      clientActionId: newClientActionId(),
    });
  };

  const back = backFor(screen);
  const leaveRoom = () => {
    send({ type: 'player:leave' });
    clearSession();
    setRoomState(null);
    setRole(null);
    setPlayerId(null);
    setPickedRoom(undefined);
    setNotice('');
    setScreen('home');
  };
  const goBack = () => {
    if (!back) return;
    switch (back.action) {
      case 'home':
        setPickedRoom(undefined);
        setScreen('home');
        break;
      case 'themes-return':
        setScreen(themesReturn);
        break;
      case 'lobby':
        setScreen('lobby');
        break;
      case 'leave':
        if (needsLeaveConfirm(roomState?.phase) && !window.confirm('¿Salir de la mesa? Perdés tu asiento en la mano en curso.')) {
          return;
        }
        leaveRoom();
        break;
    }
  };

  // The shared screen needs the whole width; every other screen stays phone-sized.
  const onMesa = screen === 'table' || role === 'mesa';
  const onHome = screen === 'home';
  const onCreate = screen === 'create';
  const onLobby = screen === 'lobby';
  const onJoin = screen === 'join' || screen === 'mesa-join';
  const feltShell = onHome || onCreate || onLobby || onJoin;

  return (
    <main
      className={
        onMesa
          ? 'app app-wide'
          : onHome
            ? 'app app-home'
            : onCreate
              ? 'app app-create'
              : onLobby
                ? 'app app-lobby'
                : onJoin
                  ? 'app app-join'
                  : 'app'
      }
    >
      {!feltShell ? (
        <div className="topbar">
          <Conn status={status} />
          {back ? (
            <button type="button" className="ghost small" onClick={goBack}>
              {back.label}
            </button>
          ) : null}
        </div>
      ) : null}
      {screen === 'home' && (
        <Home
          status={status}
          joinPrefill={prefill}
          onCreate={() => setScreen('create')}
          onJoin={() => setScreen('join')}
          onMesa={() => setScreen('mesa-join')}
          rooms={rooms}
          onRefreshRooms={() => send({ type: 'rooms:list' })}
          onPickRoom={(room, as) => {
            setPickedRoom(room.code);
            setScreen(as === 'mesa' ? 'mesa-join' : 'join');
          }}
          onOpenThemes={() => openThemes('home')}
        />
      )}
      {screen === 'themes' && (
        <ThemeSettings onClose={() => setScreen(themesReturn)} />
      )}
      {screen === 'create' && user && (
        <CreateRoom
          busy={busy}
          error={error}
          onBack={goBack}
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
          prefillRoomId={pickedRoom ?? prefill}
          busy={busy}
          error={error}
          onBack={goBack}
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
          onStart={() => {
            setNotice('');
            send({ type: 'hand:start' });
          }}
          onReady={(ready) => send({ type: 'hand:ready', ready })}
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
          {playView === 'felt' ? (
            /* Felt takes the prompt as a slot: between hands it replaces the cards. */
            <FeltView
              state={roomState}
              playerId={playerId}
              lastAction={lastAction}
              nextHandSlot={
                <NextHandPrompt
                  state={roomState}
                  playerId={playerId}
                  onReady={(ready) => send({ type: 'hand:ready', ready })}
                  onForceStart={() => {
                    setNotice('');
                    send({ type: 'hand:start' });
                  }}
                  onRebuy={() => send({ type: 'player:rebuy' })}
                />
              }
              onGoToLobby={() => setScreen('lobby')}
              onOpenThemes={() => openThemes('play')}
              onSwitchView={() => switchPlayView('classic')}
              onAction={(action, amount) => sendPlayerAction(action, amount)}
              onRebuy={() => send({ type: 'player:rebuy' })}
            />
          ) : (
            <>
              <PlayerView
                state={roomState}
                playerId={playerId}
                onOpenThemes={() => openThemes('play')}
                onSwitchView={() => switchPlayView('felt')}
                onAction={(action, amount) => sendPlayerAction(action, amount)}
              />
              <NextHandPrompt
                state={roomState}
                playerId={playerId}
                onReady={(ready) => send({ type: 'hand:ready', ready })}
                onForceStart={() => {
                  setNotice('');
                  send({ type: 'hand:start' });
                }}
                onRebuy={() => send({ type: 'player:rebuy' })}
              />
            </>
          )}
          {/* Felt has its own exit in the table menu; the top bar is the other one.
              Never gated on room phase: a FINISHED tournament used to leave no way out. */}
          {playView !== 'felt' &&
          (roomState.hand?.phase === 'COMPLETE' || roomState.phase !== 'IN_HAND') ? (
            <button type="button" className="ghost" onClick={() => setScreen('lobby')}>
              Volver al lobby
            </button>
          ) : null}
        </>
      )}
      {(screen === 'table' || role === 'mesa') && roomState && role === 'mesa' && (
        <TableView state={roomState} onOpenThemes={() => openThemes('table')} />
      )}
      {notice ? <p className="notice banner">{notice}</p> : null}
      {error && screen !== 'create' && screen !== 'join' && screen !== 'mesa-join' ? (
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
