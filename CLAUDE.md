# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Texas Hold'em No-Limit web app for playing in person with friends (fake chips). Phones are the seats, one shared device is the table. Product spec lives in [`spec.md`](spec.md); the phase-by-phase build plan lives in [`implementacion/`](implementacion/) (files renamed to `*_ok.md` once a phase is done — all 10 phases are complete).

pnpm workspace monorepo, TypeScript strict everywhere, Node ≥ 20.

## Commands

```bash
# infra first (Postgres on host :5433, Redis on :6380 by default)
cp .env.example .env
docker compose up -d postgres redis

pnpm install
pnpm --filter @poker/api prisma:generate
pnpm --filter @poker/api migrate:dev

pnpm build      # shared -> engine -> api -> web (order matters, see below)
pnpm dev        # api :3001 + web :5173 in parallel
pnpm lint       # ESLint, --max-warnings 0
pnpm typecheck
pnpm test       # engine + shared + api + web
```

Single package / single file / single test:

```bash
pnpm --filter @poker/engine test
pnpm --filter @poker/api exec node --import tsx --test test/modes.test.ts
pnpm --filter @poker/api exec node --import tsx --test --test-name-pattern "rebuy" test/modes.test.ts
```

Other entry points: `pnpm test:load` (domain load test, target P95 < 150ms locally), `pnpm test:playwright` (browser smoke in [`e2e/`](e2e/)), `pnpm deploy:prod`, `pnpm backup:pg`.

### Build-before-test gotcha

`@poker/shared` and `@poker/engine` are consumed through their **`dist/`** builds — the per-package tsconfigs deliberately set `"paths": {}`, so the `@poker/*` aliases in `tsconfig.base.json` are for editor/resolver use only, not runtime. Tests run under `node --import tsx` and import package code by workspace name, so **`pnpm build` (or at least building shared and engine) must run before `pnpm test` for api and web**. A stale `dist/` shows up as confusing type or import errors, not as a build failure.

All internal imports use explicit `.js` extensions (NodeNext); web is the exception (`moduleResolution: Bundler`).

## Architecture

### Layering, and the one rule ESLint enforces

```
packages/shared   types, WS event contracts, Result, sanitize   (no deps)
packages/engine   pure poker domain                             (depends on shared only)
apps/api          Express + ws + Prisma + Redis                 (depends on engine, shared)
apps/web          React 19 + Vite PWA                           (depends on engine, shared)
```

`eslint-plugin-boundaries` in [`.eslintrc.cjs`](.eslintrc.cjs) hard-fails any import from `engine` into `api` or `web`. The engine is pure: no network, no DB, no framework, and randomness is **injected** (`createSeededRng` / `createCryptoRng`) so hands are reproducible in tests. Keep it that way — it's why the engine can also run in the browser (see equity below).

### The WS protocol is the contract

Everything client↔server flows over a single WebSocket at `/ws`. There is no REST API for gameplay — the only HTTP routes are `/health`, `/metrics`, `/` and `/rooms/:roomId/hands`.

[`packages/shared/src/events.ts`](packages/shared/src/events.ts) defines `WsClientEvent` and `WsServerEvent` as discriminated unions. **Both api and web import these types; never redefine an event shape locally.** Adding or changing an event means editing that file first, then the `switch` in [`apps/api/src/ws/handlers.ts`](apps/api/src/ws/handlers.ts) and the `switch` in [`apps/web/src/App.tsx`](apps/web/src/App.tsx).

Request flow: `ws/gateway.ts` (socket lifecycle, JSON parse) → `ws/handlers.ts` (rate limit, auth, dispatch) → `domain/*Service.ts` (mutates the room) → `ws/hub.ts` (fan-out).

### Room state: memory is hot, Postgres is durable

Live rooms live in an in-memory `Map` ([`domain/roomRegistry.ts`](apps/api/src/domain/roomRegistry.ts)). Postgres holds an append-only event log plus periodic JSON snapshots ([`persistence/eventStore.ts`](apps/api/src/persistence/eventStore.ts), Prisma models `RoomEvent` / `RoomSnapshot`). On boot, `domain/hydrate.ts` rebuilds rooms from the latest snapshots and re-arms turn timers, so a process restart doesn't drop games.

Consequences to keep in mind when touching room code:
- Every mutation must bump `room.version` and append an event, otherwise hydration loses it.
- Anything added to `InternalRoom` must be handled in [`domain/roomSerialize.ts`](apps/api/src/domain/roomSerialize.ts) or it won't survive a restart.
- Persistence degrades gracefully: if `DATABASE_URL` is unset, writes are skipped rather than throwing (this is what lets tests run without a DB).

Mutations are serialized per room by `roomLocks.withLock(roomId, ...)` ([`domain/lock.ts`](apps/api/src/domain/lock.ts)) — an in-process chain, sufficient for single-instance. Broadcasts go through `cache/roomPubSub.ts` (Redis channel `poker:room:broadcast`, self-messages filtered by origin id) so multiple api instances fan out to each other; the local hub is always updated directly.

### Idempotency

Every `player:action` carries a client-generated `clientActionId`. `handService.applyPlayerAction` checks `room.processedActionIds` and replays the cached `HandBroadcast` on a repeat instead of re-applying — this is what makes reconnect-and-retry safe. Backed by the `ProcessedAction` table. Auto-fold on timeout uses `auto:<key>` ids for the same reason.

### Privacy boundary

[`domain/publicState.ts`](apps/api/src/domain/publicState.ts) `toPublicRoomState(room, viewerPlayerId)` is the **only** thing allowed to build what goes on the wire. It never emits `passwordHash`, the deck, or another player's hole cards. If you add a field to `InternalRoom`, it is invisible to clients until you explicitly map it here — that default is intentional. `apps/api/test/privacy.test.ts` guards it.

### Client-side equity

The web app runs the engine's Monte Carlo estimator in a Web Worker ([`apps/web/src/probability/`](apps/web/src/probability/)). The server never computes or sends equity — it only knows your own hole cards, and the estimate stays on the device.

### Card themes

Cards are pluggable SVG themes via a registry ([`apps/web/src/cards/`](apps/web/src/cards/)). Read [`apps/web/src/cards/README.md`](apps/web/src/cards/README.md) before adding one.

## Conventions

- Pure domain code returns `Result<T, GameError>` (`ok()` / `err()` from shared) rather than throwing. Errors carry a stable machine `code` that maps onto the `{ type: 'error', code, message }` WS event.
- Room passwords: 6 letters, bcrypt-hashed, never present in any payload. JWT HS256 from `JWT_SECRET`, 7d expiry; rotating the secret invalidates all sessions.
- **User-facing UI copy and product docs are in neutral Spanish (tuteo: tú/eres/puedes — not Argentine voseo: vos/sos/podés).** Code, identifiers, comments and commit messages are English. Match what's already in the file you're editing.
- Prettier + ESLint are CI gates (`pnpm lint` runs with `--max-warnings 0`).

## Testing

`node:test` + `node:assert/strict` throughout — no Jest/Vitest. Tests import sibling source via relative `../src/...js` paths.

- [`packages/engine/test/`](packages/engine/test/) — including `invariants.test.ts` (chip conservation) and `pots.test.ts` (side pots). Seeded RNG makes these deterministic; use `createSeededRng` for any new engine test.
- [`apps/api/test/`](apps/api/test/) — service-level integration against the in-memory registry, no live DB needed. `_clearAllTimersForTests()` from `timerService` must be called in `after()` or the process hangs on open timers.

## Deployment

Dev: `docker compose up --build` → web on :8088 (nginx proxies `/ws` to the api, which is why `VITE_WS_URL` is empty in Docker and the client falls back to same-origin). Prod: `docker-compose.prod.yml` + Caddy, needs `.env.production`. See [`docs/deploy.md`](docs/deploy.md) and [`docs/security-medium-checklist.md`](docs/security-medium-checklist.md).
