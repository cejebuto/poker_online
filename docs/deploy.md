# Deployment guide

## Prerequisites

- Docker + Docker Compose v2
- Open ports **80/443** on the host (firewall / cloud security group)
- Strong secrets for `POSTGRES_PASSWORD` and `JWT_SECRET`
- A domain pointed at this server (e.g. `juegapoker.online`)

## One-command production stack

```bash
cp .env.production.example .env.production
# edit secrets + SITE_ADDRESS / WEB_ORIGIN

docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

Or with the one-shot helper (generates `.env.production` if missing; default domain `juegapoker.online`):

```bash
./start_prod.sh
# equivalent: DOMAIN=juegapoker.online ./start.sh prod
```

- HTTPS/WSS via **Caddy** (`deploy/Caddyfile`)
- API runs migrations on container start (`prisma migrate deploy`)
- Web is nginx static SPA; Caddy routes `/ws`, `/health`, `/metrics`, `/rooms/*` → api

### Env vars that control public URLs

| Variable | Role |
|----------|------|
| `WEB_ORIGIN` | CORS + **invite links** (`joinUrl` / QR). Must match what users type in the browser, e.g. `https://juegapoker.online` |
| `SITE_ADDRESS` | Hostname (or `http://host`) Caddy uses for TLS / binding |
| `VITE_WS_URL` | Leave **empty** in Docker. The SPA uses same-origin `wss://<host>/ws` |

Local (`.env`) keeps `WEB_ORIGIN=http://localhost:8088`. Production (`.env.production`) uses the real domain. No code change is required to switch links: they are built from `WEB_ORIGIN` on the API.

### Scale API (2 instances)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --scale api=2
```

Redis pub/sub keeps room events consistent across instances.

### Health & metrics

- `GET /health` → postgres + redis status
- `GET /metrics` → rooms, hands, action latency p50/p95

### Backup / restore

```bash
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh docker-compose.prod.yml .env.production

# restore (example)
gunzip -c backups/poker-pg-....sql.gz \
  | docker compose -f docker-compose.prod.yml --env-file .env.production \
    exec -T postgres psql -U poker poker
```

---

## Cloudflare + domain (juegapoker.online)

Traffic path:

```
Browser  --HTTPS-->  Cloudflare  --HTTPS/HTTP-->  Caddy :80/:443  -->  web / api
```

### 1. DNS

In the Cloudflare dashboard for `juegapoker.online`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | public IP of this VPS | Proxied (orange cloud) |
| A | `www` | same IP (optional) | Proxied |

If you use `www`, either redirect it in Cloudflare or set `SITE_ADDRESS` / `WEB_ORIGIN` consistently (one canonical host).

### 2. SSL/TLS mode (Cloudflare → origin)

| Mode | Origin setup | Recommended |
|------|--------------|-------------|
| **Full** | Caddy serves HTTPS (any cert; LE is fine) | ✅ default |
| **Full (strict)** | Caddy with a valid public cert (Let's Encrypt) | ✅ best |
| **Flexible** | Origin HTTP only: `SITE_ADDRESS=http://juegapoker.online` | only if Full fails |

Also enable:

- **SSL/TLS → Edge Certificates → Always Use HTTPS** (optional, good UX)
- **Network → WebSockets** = On (default)

### 3. Host firewall

Allow inbound **80** and **443** from the internet (Cloudflare edge IPs will connect here). Do **not** expose Postgres/Redis/API ports publicly in prod compose (they are internal only).

### 4. Deploy

```bash
# .env.production already has:
#   WEB_ORIGIN=https://juegapoker.online
#   SITE_ADDRESS=juegapoker.online

./start_prod.sh
# or
pnpm deploy:prod
```

Caddy obtains a Let's Encrypt certificate for `SITE_ADDRESS` (needs port 80 reachable for the ACME challenge the first time).

**Direct IP access is blocked:** Caddy answers `403` for requests whose `Host` is the raw server IP (or any host other than `SITE_ADDRESS`). Cloudflare still works because it sends `Host: juegapoker.online`.

### 5. Verify

```bash
curl -sS https://juegapoker.online/health
# → {"status":"ok","postgres":"up","redis":"up"}

curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: 1.2.3.4' http://127.0.0.1/health
# → 403

# Invite links in lobby must look like:
#   https://juegapoker.online/join/<roomId>
```

Open the site in a phone browser: status **conectado**, create a room, copy link → domain not localhost.

### Troubleshooting (Cloudflare)

| Symptom | Check |
|---------|--------|
| 522 / 521 from Cloudflare | Origin down or ports 80/443 closed; `docker compose … ps` |
| Web loads, WS fails | Cloudflare WebSockets on; Caddy `/ws` → api; browser uses `wss://` same host |
| Invite link is localhost | API still has old `WEB_ORIGIN` — restart api with `.env.production` |
| Certificate errors (Full strict) | Wait for Caddy LE; `docker compose … logs caddy`; temporarily use Full |
| CORS / blocked API | `WEB_ORIGIN` must be exactly `https://juegapoker.online` (no trailing slash) |
| ACME / TLS fail behind CF | Ensure no page rule blocks `/.well-known/*`; try Full instead of Flexible |

---

## Dev vs prod

| | Dev / local Docker | Prod |
|--|--------------------|------|
| Compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| Env file | `.env` | `.env.production` |
| TLS | optional | Caddy (+ Cloudflare edge) |
| Ports | 8088 / 3001 / 5433 | 80 / 443 only |
| `WEB_ORIGIN` | `http://localhost:8088` | `https://juegapoker.online` |
| Logs | debug-friendly | info (structured JSON) |

### Local development (unchanged)

Keep using:

```bash
./start.sh              # or docker compose up --build
# web http://localhost:8088
```

Or Node without full stack:

```bash
docker compose up -d postgres redis
pnpm dev   # api :3001 + web :5173
```

Do not mix both stacks on the same ports. `./start.sh prod` stops the local stack first.

---

### Card themes

See [apps/web/src/cards/README.md](../apps/web/src/cards/README.md).
