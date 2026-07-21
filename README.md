# Poker con Amigos

App web de **Texas Hold'em No-Limit** para jugar presencialmente con amigos (fichas ficticias). Teléfonos = asientos; un dispositivo = mesa.

Spec: [`spec.md`](./spec.md) · Plan de implementación: [`implementacion/`](./implementacion/)

## Stack

| Capa | Tech |
|------|------|
| Monorepo | pnpm workspaces + TypeScript strict |
| Motor | `@poker/engine` (puro, sin red/DB) |
| Tipos | `@poker/shared` |
| API | Node + Express + WebSocket + Prisma + Redis |
| Web | React + Vite (PWA) |
| Infra | Docker Compose (Postgres, Redis, api, web) |

## Arranque rápido (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:8088 (debe mostrar **conectado**)
- API health: http://localhost:3001/health → `{ "status": "ok", ... }`
- WS: `ws://localhost:3001/ws` (también proxy en `/ws` vía nginx de `web`)

### Seguridad media (concepto)

- Contraseña de sala: 6 letras, **bcrypt** (nunca en payloads).
- JWT HS256 con secreto de entorno (`JWT_SECRET`) y expiración 7d.
- Rate limiting por conexión (joins/actions/creates).
- CORS restringido a `WEB_ORIGIN`.
- En **producción**: servir detrás de TLS (WSS); no exponer `JWT_SECRET` ni `.env`.
- Rotación de JWT: cambiar `JWT_SECRET` invalida sesiones (re-join).

## Desarrollo local

Requisitos: Node ≥ 20, pnpm, Docker (para Postgres/Redis).

```bash
# infra
docker compose up -d postgres redis

cp .env.example .env
pnpm install
pnpm --filter @poker/api prisma:generate
pnpm --filter @poker/api migrate:dev   # o migrate
pnpm build
pnpm dev   # api :3001 + web :5173
```

Scripts raíz:

| Script | Qué hace |
|--------|----------|
| `pnpm build` | Compila shared → engine → api → web |
| `pnpm lint` | ESLint (incluye regla: `engine` no importa `api`/`web`) |
| `pnpm test` | Tests de todos los paquetes |
| `pnpm dev` | API + web en paralelo |
| `pnpm format` | Prettier |

## Estructura

```
apps/api          backend HTTP + WebSocket
apps/web          React PWA
packages/engine   motor de poker (dominio puro)
packages/shared   tipos, eventos WS, Result
implementacion/   plan por fases
```

## Fases

Ver [`implementacion/README.md`](./implementacion/README.md). Los archivos `*_ok.md` marcan fases ya implementadas.
