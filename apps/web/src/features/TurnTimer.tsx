import { useEffect, useState } from 'react';
import { turnClock } from './turnClock';

export function TurnTimer({
  turnStartedAt,
  turnTimeoutMs,
  timeBankMs,
  isMyTurn,
  active = true,
}: {
  turnStartedAt?: number;
  turnTimeoutMs?: number;
  timeBankMs?: number;
  isMyTurn: boolean;
  /** Whether a hand is actually waiting on someone. */
  active?: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!turnStartedAt || !turnTimeoutMs) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [turnStartedAt, turnTimeoutMs]);

  // Between hands there is no clock to report — claiming "sin límite" here read
  // as if the room had no timer configured.
  if (!active) return null;

  const clock = turnClock({
    now,
    startedAt: turnStartedAt,
    timeoutMs: turnTimeoutMs,
    bankMs: timeBankMs,
  });
  if (!clock) {
    return <p className="meta">Timer: sin límite</p>;
  }

  const bank = timeBankMs ?? 0;
  const pct = Math.max(0, Math.min(100, (1 - clock.spent) * 100));

  return (
    <div className={`turn-timer ${isMyTurn ? 'mine' : ''} ${clock.inBank ? 'bank' : ''}`}>
      <div className="turn-timer-bar">
        <div className="turn-timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="meta">
        {isMyTurn ? 'Tu reloj' : 'Reloj'} · {(clock.remainingMs / 1000).toFixed(1)}s
        {clock.inBank ? ' (time bank)' : ''} · bank {(bank / 1000).toFixed(0)}s
      </span>
    </div>
  );
}
