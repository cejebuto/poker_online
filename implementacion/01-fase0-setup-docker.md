# Fase 0 — Setup + Docker

**Objetivo:** dejar el monorepo funcionando, dockerizado y con CI, de modo que cualquiera clone y con un comando tenga todo el stack corriendo. Base sobre la que se construye todo lo demás.

**Depende de:** [`00-fundamentos-y-arquitectura.md`](./00-fundamentos-y-arquitectura.md).

---

## Tareas

### 0.1 Scaffolding del monorepo
- [ ] `[INFRA]` Crear repo con pnpm workspaces (`packages/*`, `apps/*`). `S`
- [ ] `[INFRA]` `tsconfig.base.json` con `strict: true`, paths para `@poker/engine`, `@poker/shared`. `S`
- [ ] `[INFRA]` ESLint (con regla de límites de import entre capas) + Prettier + EditorConfig. `S`
- [ ] `[INFRA]` Scripts raíz: `build`, `lint`, `test`, `dev`, `format`. `S`

### 0.2 Apps mínimas "hola mundo"
- [ ] `[BE]` `apps/api`: servidor HTTP con endpoint `GET /health` → `{ status: 'ok' }`. `S`
- [ ] `[BE]` Servidor WebSocket que acepta conexión y responde `ping/pong`. `S`
- [ ] `[FE]` `apps/web`: React + Vite (PWA) que muestra "conectado" al abrir WS contra la api. `M`

### 0.3 Infra local (Docker)
- [ ] `[INFRA]` `Dockerfile` multi-stage para `api` (build TS → runtime node slim). `M`
- [ ] `[INFRA]` `Dockerfile` multi-stage para `web` (build Vite → servir con nginx o vite preview). `M`
- [ ] `[INFRA]` `docker-compose.yml` con servicios: `postgres`, `redis`, `api`, `web`. `M`
- [ ] `[INFRA]` `.env.example` con `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WEB_ORIGIN`, puertos. `S`
- [ ] `[INFRA]` Healthchecks + `depends_on: condition: service_healthy`. `S`
- [ ] `[INFRA]` Volúmenes persistentes para Postgres; hot-reload en dev (bind mounts + `pnpm dev`). `M`

### 0.4 Base de datos y migraciones
- [ ] `[BE]` Elegir y configurar acceso a Postgres (Prisma o Drizzle). `S`
- [ ] `[BE]` Migración inicial vacía + comando `migrate`. `S`
- [ ] `[BE]` Conexión a Redis verificada al arranque (log + healthcheck). `S`

### 0.5 CI
- [ ] `[INFRA]` Pipeline (GitHub Actions u otro): `install → lint → build → test`. `M`
- [ ] `[INFRA]` Job que hace `docker compose build` para validar imágenes. `S`

---

## Criterios de aceptación

- [ ] En una máquina limpia: `cp .env.example .env && docker compose up --build` deja `web` accesible en el navegador y muestra "conectado" (WS vivo contra `api`).
- [ ] `GET /health` responde `200 { status: 'ok' }`.
- [ ] `api` conecta a Postgres y Redis al arrancar (logs lo confirman; healthchecks en verde).
- [ ] `pnpm build`, `pnpm lint` y `pnpm test` pasan en local y en CI.
- [ ] Levantar y bajar el stack no pierde datos de Postgres (volumen persistente).
- [ ] El lint falla si `engine` importa algo de `api`/`web` (regla de límites activa).

## Definición de Hecho
- [ ] Todo lo anterior en verde + README raíz con instrucciones de arranque + PR revisado y mergeado.
