# Umbrella.lgbt — M7 Deploy & Hardening Runbook

> Everything needed to take Upgrade 1 live: VPS backend, Vercel frontend, backups, monitoring.
> The code and scripts are in this repo; this runbook covers the one-time setup and day-2 ops.

## Architecture recap

```
[Vercel]  Next.js (apps/web) — umbrella.lgbt
    │  HTTPS  →  api.umbrella.lgbt
    ▼
[VPS]     Docker Compose (infra/docker-compose.yml)
    ├── caddy   (reverse proxy + SSL for api.umbrella.lgbt)
    ├── api     (Express + Prisma, apps/api)  ← runs `prisma migrate deploy` on boot
    └── db      (PostgreSQL 16, volume `db-data`)
```

---

## 1. One-time VPS setup

1. **Docker + Compose** on the server:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo systemctl enable --now docker
   ```
2. **Clone the repo** with a read-only deploy key (repo → Settings → Deploy keys):
   ```bash
   sudo mkdir -p /opt && sudo chown "$USER" /opt
   git clone git@github.com:nekwasar/umbrella.lgbt.git /opt/umbrella.lgbt
   ```
3. **Secrets file** (gitignored, never committed):
   ```bash
   cd /opt/umbrella.lgbt
   cp infra/.env.example infra/.env
   nano infra/.env   # fill real values:
   ```
   - `POSTGRES_PASSWORD` — strong random
   - `JWT_SECRET` — long random (`openssl rand -hex 32`)
   - `SUPERADMIN_PASSWORD` — strong; you can log in with `SUPERADMIN_USERNAME` (default `admin`)
   - `CORS_ORIGIN=https://umbrella.lgbt`
   - `API_DOMAIN=api.umbrella.lgbt`
4. **DNS**: add `api.umbrella.lgbt` → A record pointing at the VPS IP.
5. **Start once** (verifies compose + seeds the superadmin):
   ```bash
   ./infra/scripts/deploy.sh
   ```
   Check: `curl https://api.umbrella.lgbt/health` → `{"status":"ok","db":"up",...}`

## 2. Deploying updates

- **Automatic**: push to `main` → CI runs → the **Deploy** workflow SSHes in and runs `deploy.sh` (pull, rebuild, restart, wait for healthy).
- **Manual**: `cd /opt/umbrella.lgbt && ./infra/scripts/deploy.sh`
- GitHub Actions **secrets** to configure: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (default 22), `REPO_DIR` (default `/opt/umbrella.lgbt`).

## 3. Vercel cutover (frontend)

The old static site used the root `vercel.json` (removed). The new frontend is `apps/web`:

1. In the Vercel project for `umbrella.lgbt` (or import the repo as a new project):
   - **Root Directory**: `apps/web`
   - Framework: **Next.js** (auto-detected)
2. **Environment variables**:
   - `NEXT_PUBLIC_API_URL` = `https://api.umbrella.lgbt` (client side)
   - `API_SERVER_URL` = `https://api.umbrella.lgbt` (server side / sitemap)
3. Domain `umbrella.lgbt` already attached; SSL auto-provisions.
4. Verify:
   - `curl -sI https://umbrella.lgbt | head -1` → `200 OK`
   - `curl -s https://umbrella.lgbt/sitemap.xml | head` → XML with ~160+ URLs
   - `curl -s https://umbrella.lgbt/robots.txt` → Sitemap line
   - `curl -s https://umbrella.lgbt/qa/what-is-gender-dysphoria` → FAQPage JSON-LD present
5. Re-submit `https://umbrella.lgbt/sitemap.xml` in Google Search Console / Bing.

## 4. Backups

- Script: `infra/scripts/backup.sh` (pg_dump → gzip → `/var/backups/umbrella`, prunes after 14 days).
- Cron (daily 03:00):
  ```bash
  echo '0 3 * * * /opt/umbrella.lgbt/infra/scripts/backup.sh >> /var/log/umbrella-backup.log 2>&1' | crontab -
  ```
- Restore:
  ```bash
  docker compose -f /opt/umbrella.lgbt/infra/docker-compose.yml exec -T db \
    psql -U umbrella -d umbrella < umbrella-YYYY-MM-DD_HHMMSS.sql.gz
  ```
  (gzip -d | psql if piped; the script writes a `.sql.gz`.)

## 5. Monitoring

- `infra/scripts/healthcheck.sh` pings API + site every run; optional webhook alert via `ALERT_URL`.
- Cron (every 5 min):
  ```bash
  echo '*/5 * * * * ALERT_URL=https://ntfy.sh/your-topic /opt/umbrella.lgbt/infra/scripts/healthcheck.sh >> /var/log/umbrella-health.log 2>&1' | crontab -
  ```
- Docker healthchecks already gate `db` and `api`; `docker compose ps` shows state.

## 6. Rollback

1. `git revert <bad-commit>` on main and push → Deploy workflow rebuilds.
2. Or, on the VPS: `git checkout <good-sha>` then `./infra/scripts/deploy.sh`.
3. DB schema is forward-only via migrations — to undo a schema change, restore a backup (see §4).

## 7. Security checklist (hardening shipped)

- API: `helmet`, CORS restricted to the site, httpOnly cookies, bcrypt(12), **global 300 req/min/IP rate limit** + tighter limits on auth/ask/answer/comment/vote/pin/admin-create, `trust proxy` so limits key off the real IP.
- Container: **runs as non-root user** (`umbrella`), `.env` gitignored and never built into the image.
- Admin: superadmin seeded from env only; additional admins created in the dashboard; self password change requires the current password.
- **Rotate `SUPERADMIN_PASSWORD` and `JWT_SECRET`** if either was ever exposed (the earlier session token was shared — consider revoking it in GitHub settings).

## 8. First-launch checklist

- [ ] `api.umbrella.lgbt` DNS + Caddy SSL verified (`/health` = ok)
- [ ] Vercel project Root Directory = `apps/web` + env vars set
- [ ] `https://umbrella.lgbt` serves 200; sitemap/robots live
- [ ] Search Console + Bing re-submit sitemap
- [ ] Backup cron + healthcheck cron installed
- [ ] Deploy workflow secrets configured (`VPS_*`, `REPO_DIR`)
