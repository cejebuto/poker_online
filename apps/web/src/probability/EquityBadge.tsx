import type { EquityResult } from '@poker/engine';

export function EquityBadge({
  enabled,
  onToggle,
  result,
  calculating,
  error,
}: {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  result: EquityResult | null;
  calculating: boolean;
  error: string | null;
}) {
  return (
    <div className="equity-badge">
      <label className="equity-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        Probabilidad
      </label>
      {!enabled ? (
        <span className="meta">oculta</span>
      ) : calculating ? (
        <span className="equity-calc">calculando…</span>
      ) : error ? (
        <span className="error">{error}</span>
      ) : result ? (
        <div className="equity-nums" title={`${result.iterations} sims · solo tus cartas`}>
          <span className="equity-win">{result.winPct.toFixed(1)}% win</span>
          <span className="equity-tie">{result.tiePct.toFixed(1)}% tie</span>
        </div>
      ) : (
        <span className="meta">—</span>
      )}
    </div>
  );
}
