#!/usr/bin/env bash
# Backup Postgres volume via docker compose.
# Usage:
#   ./scripts/backup-postgres.sh [compose-file] [env-file]
set -euo pipefail

COMPOSE="${1:-docker-compose.prod.yml}"
ENV_FILE="${2:-.env.production}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/poker-pg-$STAMP.sql.gz"

echo "Backing up to $OUT"
if [[ -f "$ENV_FILE" ]]; then
  docker compose -f "$COMPOSE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-poker}" "${POSTGRES_DB:-poker}" | gzip > "$OUT"
else
  docker compose -f "$COMPOSE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-poker}" "${POSTGRES_DB:-poker}" | gzip > "$OUT"
fi
echo "OK $OUT ($(du -h "$OUT" | awk '{print $1}'))"
echo "Restore: gunzip -c $OUT | docker compose -f $COMPOSE exec -T postgres psql -U poker poker"
