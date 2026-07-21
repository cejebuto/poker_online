/**
 * Domain-layer load test (no network): N rooms × 2 players × H hands.
 * Reports P50/P95 action latency.
 *
 *   pnpm exec tsx scripts/load-test-domain.ts [rooms=30] [hands=2]
 */
import { createRoom, joinRoom } from '../apps/api/src/domain/roomService.ts';
import { applyPlayerAction, startRoomHand } from '../apps/api/src/domain/handService.ts';
import { roomRegistry } from '../apps/api/src/domain/roomRegistry.ts';
import { _clearAllTimersForTests } from '../apps/api/src/domain/timerService.ts';

const ROOMS = Number(process.argv[2] ?? 30);
const HANDS = Number(process.argv[3] ?? 2);
const TARGET_P95_MS = 150;

const latencies: number[] = [];

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

async function oneRoom(i: number): Promise<void> {
  const pwd = 'Loadxx';
  const host = await createRoom({
    password: pwd,
    user: { displayName: `H${i}` },
    connectionId: `lh-${i}`,
    config: { turnTimeoutMs: 0, startingStack: 300, name: `Load ${i}` },
  });
  await joinRoom({
    roomId: host.room.roomId,
    password: pwd,
    user: { displayName: `G${i}` },
    connectionId: `lg-${i}`,
  });
  const room = roomRegistry.get(host.room.roomId)!;

  for (let h = 0; h < HANDS; h++) {
    startRoomHand(room);
    let steps = 0;
    while (room.hand && room.hand.phase !== 'COMPLETE' && steps++ < 120) {
      const seat = room.hand.currentToAct;
      if (seat === null) break;
      const player = [...room.players.values()].find((p) => p.seat === seat)!;
      const hp = room.hand.players.find((p) => p.seat === seat)!;
      const toCall = room.hand.currentBet - hp.betThisRound;
      const t0 = performance.now();
      applyPlayerAction(room, {
        playerId: player.playerId,
        handId: room.hand.handId,
        action: toCall > 0 ? 'call' : 'check',
        clientActionId: `load-${i}-${h}-${steps}`,
      });
      latencies.push(performance.now() - t0);
    }
  }
}

async function main(): Promise<void> {
  const t0 = performance.now();
  await Promise.all(Array.from({ length: ROOMS }, (_, i) => oneRoom(i)));
  const wall = performance.now() - t0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const report = {
    rooms: ROOMS,
    handsPerRoom: HANDS,
    actions: latencies.length,
    wallMs: Math.round(wall),
    p50: Math.round(pct(sorted, 50) * 100) / 100,
    p95: Math.round(pct(sorted, 95) * 100) / 100,
    p99: Math.round(pct(sorted, 99) * 100) / 100,
    targetP95Ms: TARGET_P95_MS,
    ok: pct(sorted, 95) < TARGET_P95_MS,
  };
  console.log(JSON.stringify(report, null, 2));
  _clearAllTimersForTests();
  if (!report.ok) {
    console.error('FAIL: P95 latency above target');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
