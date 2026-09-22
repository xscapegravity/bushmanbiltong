# Ops runbook — deploy & verify Bushman Biltong on the VPS
# (docs/deployment.md is the full narrative; this is the command sequence)

# 1. Local: verify build + tests first
npm ci && npm run typecheck && npm test && npm run build

# 2. Ship source to VPS (rsync excludes junk)
rsync -av --delete \
  --exclude node_modules --exclude .next --exclude data --exclude assets \
  --exclude .git --exclude .env \
  "/c/Users/marty/OneDrive/00. Git/bushmanbiltong/" \
  root@76.13.196.154:/docker/bushmanbiltong/

# 3. On the VPS: create env file (once)
ssh root@76.13.196.154
cd /docker/bushmanbiltong
cp .env.example .env   # then edit: set SESSION_SECRET (64 hex), business values
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Build & start ( NEVER touches the traefik project )
docker compose up -d --build

# 5. Create the first admin (inside the container, then unset the vars)
docker compose exec app node -e "process.env.ADMIN_EMAIL='OWNER_EMAIL';process.env.ADMIN_PASSWORD='TEMP';" # see README admin bootstrap
# Simpler: run the seed once with env vars:
docker compose run --rm -e ADMIN_EMAIL=owner@example.com -e ADMIN_PASSWORD=<temp> app npm run db:seed
# then rotate: docker compose run --rm app node scripts/reset-admin.js   (see README)

# 6. Verify
curl -sI https://bushmanbiltong.xscapebot.tech | head -3   # expect HTTP/2 200 + server: Traefik
docker compose ps                                           # healthcheck healthy

# 7. Logs / rollback
docker compose logs -f app
docker compose down            # stop (data volume persists)
git revert + rerun steps 2-4   # rollback
