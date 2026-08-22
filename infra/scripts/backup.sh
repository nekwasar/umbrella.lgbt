#!/usr/bin/env bash
# Umbrella.lgbt — PostgreSQL backup script (run via cron on the VPS)
#
# Example crontab (daily 3am):
#   0 3 * * * /opt/umbrella/infra/scripts/backup.sh >> /var/log/umbrella-backup.log 2>&1
#
# Restore:
#   docker compose -f infra/docker-compose.yml exec -T db \
#     psql -U umbrella -d umbrella < umbrella-YYYY-MM-DD.sql.gz
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${COMPOSE_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ENV_FILE}"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-umbrella}"
POSTGRES_DB="${POSTGRES_DB:-umbrella}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/umbrella}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="${BACKUP_DIR}/umbrella-${STAMP}.sql.gz"

docker compose -f "${COMPOSE_DIR}/docker-compose.yml" exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${OUT}"

# prune old backups
find "${BACKUP_DIR}" -name 'umbrella-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

echo "[backup] wrote ${OUT}"
