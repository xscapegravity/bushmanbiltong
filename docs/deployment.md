# Deployment — Bushman Biltong

Target: Hostinger VPS `srv1383735` (76.13.196.154), Ubuntu 24.04 + Docker + Traefik.
URL: `https://bushmanbiltong.xscapebot.tech` (DNS verified → 76.13.196.154).

## HARD CONSTRAINT

The `traefik` compose project (`/docker/traefik`) is **never modified, restarted, or
rebuilt by this project**. The app integrates purely via:
1. joining the external `traefik` docker network, and
2. Traefik `labels` on the app container.

## Prerequisites

- Docker + compose plugin on the VPS (already present).
- The `traefik` external network exists (verify: `docker network ls | grep traefik`).
- Let's Encrypt resolver named `letsencrypt` in the existing Traefik config
  (verify via an existing site's cert issuer, e.g. mysoul.xscapebot.tech).

## First deployment

```bash
# local (git-bash): ship source
rsync -av --delete \
  --exclude node_modules --exclude .next --exclude data --exclude assets \
  --exclude .git --exclude .env \
  "/c/Users/marty/OneDrive/00. Git/bushmanbiltong/" \
  root@76.13.196.154:/docker/bushmanbiltong/

ssh root@76.13.196.154
cd /docker/bushmanbiltong

# env file (once) — NEVER commit
cp .env.example .env
# set: SESSION_SECRET (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
#      business values: PICKUP_*, DELIVERY_* (postcodes/fee), BUSINESS_EMAIL

docker network create traefik 2>/dev/null || true   # only if missing
docker compose up -d --build

# first admin (one-off; use a temporary password, rotate after first login)
docker compose run --rm -e ADMIN_EMAIL=owner@example.com -e ADMIN_PASSWORD='temp-pass' app npm run db:seed
```

## Verify

```bash
docker compose ps                 # healthy
curl -sI https://bushmanbiltong.xscapebot.tech | head -3
# → HTTP/2 200, server: Traefik; cert issued automatically on first hit
```

Then log in at `/admin/login`, change the admin password (admin UI or re-run seed
with a new ADMIN_PASSWORD), and delete the temp value.

## Updates

```bash
# local: rsync again (same command), then on VPS:
cd /docker/bushmanbiltong && docker compose up -d --build
```

Migrations run automatically at container start (tracked in the `migrations` table);
no manual step. The SQLite file lives in the `bb-data` volume — deploys never touch it.

## Custom domain cutover (bushmanbiltong.com) — REQUIRES OWNER APPROVAL

1. Owner adds DNS at their registrar:
   - `A` record `bushmanbiltong.com` → `76.13.196.154`
   - `A` record `www` → `76.13.196.154`
2. Edit `/docker/bushmanbiltong/.env`: `NEXT_PUBLIC_SITE_URL=https://bushmanbiltong.com`
3. Edit the ONE label in `docker-compose.yml`:
   `Host(\`bushmanbiltong.com\`)` (or add `Host(\`www.bushmanbiltong.com\`)` via OR).
4. `docker compose up -d` (app container only — Traefik picks up labels live).
5. Verify cert issuance: `curl -sI https://bushmanbiltong.com`.

No destructive DNS step is ever automated here.

## Backups (orders are business records)

```bash
# safe online backup of SQLite (WAL-aware):
docker compose exec app sh -c \
  'node -e "require(\"better-sqlite3\")(process.env.DATABASE_PATH).backup(\"/app/data/backup-\$(date +%F).db\")"'
# or copy while WAL active:
cp /var/lib/docker/volumes/bushmanbiltong_bb-data/_data/biltong.db* /backups/
```

Recommended: nightly cron on the VPS copying `bb-data` to `/backups/` + off-VPS
(OneDrive/rclone). Retain ≥ 30 days. Documented here, implemented as a cron job
with visible metadata per house rules — not a hidden script.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 404 from Traefik | `docker network inspect traefik` includes app container |
| Cert error | first hit triggers issuance — wait 30s, retry; check `docker logs traefik-traefik-1` (read-only) |
| App unhealthy | `docker compose logs app` — usually missing env (SESSION_SECRET) |
| 500 on order submit | `docker compose logs app`; data volume permissions |
| DB locked | WAL is on; check for a stuck `docker compose run` job |
