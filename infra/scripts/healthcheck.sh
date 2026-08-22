#!/usr/bin/env bash
# Umbrella.lgbt — health monitor for cron. Optionally alerts a webhook.
# Example crontab (every 5 min):
#   */5 * * * * /opt/umbrella.lgbt/infra/scripts/healthcheck.sh >> /var/log/umbrella-health.log 2>&1
set -uo pipefail

API_URL="${API_URL:-https://api.umbrella.lgbt/health}"
SITE_URL="${SITE_URL:-https://umbrella.lgbt}"
ALERT_URL="${ALERT_URL:-}" # optional webhook (Slack/Discord/ntfy) to notify

notify() {
  local msg="$1"
  echo "[healthcheck] $(date -Is) $msg"
  if [[ -n "${ALERT_URL}" ]]; then
    curl -fsS -m 10 -X POST "${ALERT_URL}" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"Umbrella.lgbt alert: $msg\"}" >/dev/null 2>&1 || true
  fi
}

api_status="$(curl -fsS -o /dev/null -w '%{http_code}' -m 10 "${API_URL}" 2>/dev/null || echo 000)"
site_status="$(curl -fsS -o /dev/null -w '%{http_code}' -m 10 "${SITE_URL}" 2>/dev/null || echo 000)"

if [[ "${api_status}" != "200" ]]; then
  notify "API down (HTTP ${api_status})"
fi
if [[ "${site_status}" != "200" ]]; then
  notify "Site down (HTTP ${site_status})"
fi

echo "[healthcheck] $(date -Is) api=${api_status} site=${site_status}"
