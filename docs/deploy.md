# Deployment guide

## Prerequisites

- Docker + Docker Compose v2
- Open ports 80/443 (prod) or custom `HTTP_PORT`/`HTTPS_PORT`
- Strong secrets for `POSTGRES_PASSWORD` and `JWT_SECRET`

## One-command production stack

```bash
cp .env.production.example .env.production
# edit secrets + SITE_ADDRESS / WEB_ORIGIN

docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

- HTTPS/WSS via **Caddy** (`deploy/Caddyfile`)
- API runs migrations on container start (`prisma migrate deploy`)
- Web is nginx static SPA, proxies `/ws` and `/health` in dev compose; prod Caddy routes API paths

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

### Troubleshooting

| Symptom | Check |
|---------|--------|
| Web loads, WS fails | Caddy `/ws` → api; `WEB_ORIGIN` matches browser origin |
| Health degraded | `docker compose logs postgres redis api` |
| JWT invalid after restart | `JWT_SECRET` changed → users re-join |
| Migrations fail | `DATABASE_URL` inside api container |

### Dev vs prod

| | Dev | Prod |
|--|-----|------|
| Compose | `docker-compose.yml` | `docker-compose.prod.yml` |
| TLS | optional | Caddy |
| Ports | 8088/3001/5433 | 80/443 |
| Logs | debug | info (structured JSON) |

### Card themes

See [apps/web/src/cards/README.md](../apps/web/src/cards/README.md).
