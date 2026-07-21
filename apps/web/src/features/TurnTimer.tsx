import { useEffect, useState } from 'react';

export function TurnTimer({
  turnStartedAt,
  turnTimeoutMs,
  timeBankMs,
  isMyTurn,
}: {
  turnStartedAt?: number;
  turnTimeoutMs?: number;
  timeBankMs?: number;
  isMyTurn: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!turnStartedAt || !turnTimeoutMs) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [turnStartedAt, turnTimeoutMs]);

  if (!turnStartedAt || !turnTimeoutMs || turnTimeoutMs <= 0) {
    return <p className="meta">Timer: sin límite</p>;
  }

  const elapsed = now - turnStartedAt;
  const bank = timeBankMs ?? 0;
  const total = turnTimeoutMs + bank;
  const remaining = Math.max(0, total - elapsed);
  const inBank = elapsed > turnTimeoutMs;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));

  return (
    <div className={`turn-timer ${isMyTurn ? 'mine' : ''} ${inBank ? 'bank' : ''}`}>
      <div className="turn-timer-bar">
        <div className="turn-timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="meta">
        {isMyTurn ? 'Tu reloj' : 'Reloj'} · {(remaining / 1000).toFixed(1)}s
        {inBank ? ' (time bank)' : ''} · bank {(bank / 1000).toFixed(0)}s
      </span>
    </div>
  );
}
