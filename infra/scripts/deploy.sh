#!/usr/bin/env bash
# Umbrella.lgbt — VPS deploy script.
# Run ON the server (manually or via the CI SSH workflow). Requires:
#   - repo cloned at ${REPO_DIR} (default /opt/umbrella.lgbt) with a deploy key
#   - docker + docker compose installed
#   - infra/.env populated with real secrets (created once from .env.example)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/umbrella.lgbt}"
COMPOSE_FILE="${REPO_DIR}/infra/docker-compose.yml"

if [[ ! -d "${REPO_DIR}" ]]; then
  echo "[deploy] repo not found at ${REPO_DIR}. Clone it first:" >&2
  echo "  git clone <repo-url> ${REPO_DIR}" >&2
  exit 1
fi

cd "${REPO_DIR}"

echo "[deploy] pulling latest main…"
git fetch origin main
git checkout main
git pull origin main

if [[ ! -f infra/.env ]]; then
  cp infra/.env.example infra/.env
  echo "[deploy] ERROR: created infra/.env from example — EDIT IT with real secrets, then re-run." >&2
  exit 1
fi

echo "[deploy] building + starting stack…"
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "[deploy] waiting for API health…"
for _ in $(seq 1 30); do
  if docker compose -f "${COMPOSE_FILE}" exec -T api \
    node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "[deploy] API healthy ✓"
    exit 0
  fi
  sleep 2
done

echo "[deploy] ERROR: API did not become healthy." >&2
docker compose -f "${COMPOSE_FILE}" ps
exit 1
