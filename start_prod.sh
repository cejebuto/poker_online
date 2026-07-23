#!/usr/bin/env bash
# One-shot production launcher (Caddy TLS on :80/:443).
#
# Usage:
#   ./start_prod.sh                          # domain from DOMAIN env or .env.production
#                                            # default: juegapoker.online
#   ./start_prod.sh --domain=juegapoker.online
#   DOMAIN=juegapoker.online ./start_prod.sh
#   ./start_prod.sh down                     # stop stack (volumes kept)
#   ./start_prod.sh --reset-db               # DESTROYS DB volume, then starts
#
# Requires Docker. See docs/deploy.md (Cloudflare, WEB_ORIGIN, backups).
set -euo pipefail

cd "$(dirname "$0")"

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      awk 'NR>1 && /^#/ {print substr($0,3)} NR>1 && !/^#/ {exit}' "$0"
      exit 0
      ;;
  esac
done

# Default public host when creating a new .env.production
if [[ -z "${DOMAIN:-}" ]]; then
  if [[ -f .env.production ]]; then
    # Prefer existing SITE_ADDRESS so re-runs stay stable
    DOMAIN="$(
      grep -E '^SITE_ADDRESS=' .env.production 2>/dev/null \
        | head -1 \
        | cut -d= -f2- \
        | sed -e 's#^https\?://##' -e 's#/$##'
    )"
  fi
  DOMAIN="${DOMAIN:-juegapoker.online}"
fi
export DOMAIN

# Strip accidental scheme if the user exported DOMAIN=https://...
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%/}"
export DOMAIN

exec ./start.sh prod "$@"
