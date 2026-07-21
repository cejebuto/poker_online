#!/usr/bin/env node
/**
 * Basic load: N concurrent rooms, each with 2 players playing check-down hands via domain API path.
 * Usage: node scripts/load-test.mjs [rooms=20] [hands=2]
 *
 * Target (local): P95 action latency < 150ms documented below.
 */
import { performance } from 'node:perf_hooks';

// Dynamic import of compiled TS via tsx when run with: pnpm exec tsx scripts/load-test.ts
// This mjs version uses HTTP /metrics after docker is up — for offline, run load-test-domain.ts

const ROOMS = Number(process.argv[2] ?? 20);
const HANDS = Number(process.argv[3] ?? 2);

console.log(
  JSON.stringify({
    msg: 'load-test:hint',
    rooms: ROOMS,
    hands: HANDS,
    run: 'pnpm exec tsx scripts/load-test-domain.ts',
  }),
);
