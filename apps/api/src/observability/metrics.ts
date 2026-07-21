/**
 * In-process metrics (single instance). Good enough for MVP observability.
 */

const startedAt = Date.now();

export const metrics = {
  roomsCreated: 0,
  handsStarted: 0,
  handsCompleted: 0,
  actionsApplied: 0,
  wsConnections: 0,
  eventLatenciesMs: [] as number[],
};

const MAX_SAMPLES = 500;

export function recordLatency(ms: number): void {
  metrics.eventLatenciesMs.push(ms);
  if (metrics.eventLatenciesMs.length > MAX_SAMPLES) {
    metrics.eventLatenciesMs.shift();
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

export function metricsSnapshot(activeRooms: number) {
  const sorted = [...metrics.eventLatenciesMs].sort((a, b) => a - b);
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    activeRooms,
    roomsCreated: metrics.roomsCreated,
    handsStarted: metrics.handsStarted,
    handsCompleted: metrics.handsCompleted,
    actionsApplied: metrics.actionsApplied,
    wsConnections: metrics.wsConnections,
    latencyMs: {
      samples: sorted.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    },
  };
}
