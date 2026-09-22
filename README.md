# Bushman Biltong

Premium artisan biltong, sold direct: browse, order, pickup or local delivery.
This repository is the production website + lightweight order-management system (v1).

**Stack:** Next.js 14 (TypeScript, server actions) · SQLite (better-sqlite3, WAL) ·
Docker Compose on a Hostinger VPS behind an existing Traefik proxy (never modified).

## Quick start (local dev)

```bash
npm ci
cp .env.example .env        # fill SESSION_SECRET etc. (dev values fine)
npm run db:seed             # migrations + SAMPLE products + optional admin
npm run dev                 # http://localhost:3000
```

Login at `/admin/login` with the ADMIN_EMAIL/ADMIN_PASSWORD you seeded.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build (standalone) |
| `npm start` | serve production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest unit tests |
| `npm run db:seed` | apply migrations + seed SAMPLE products + admin bootstrap |
| `npm run admin:create` | same as db:seed (idempotent; creates/resets admin) |

## Architecture (short version)

- `src/lib/` — domain core: config (env-driven), db (migrations), money (integer cents),
  delivery rules, auth (scrypt + sessions + lockout), orders (transactional creation),
  email (stub; v1 has no email by decision — the admin dashboard is the order inbox).
- `src/app/(public)/` — Home, Order, Contact, Privacy. Server components + one client order form.
- `src/app/admin/` — login, dashboard, orders, products. Session cookie `bb_admin`,
  HttpOnly/SameSite=Lax/Secure; server-side session check on every admin page.
- Totals are **always** recalculated server-side; the browser never sets a price.
- Order numbers `BB-10001…` from a counter table, allocated in the order transaction.

## Deployment

Target: `https://bushmanbiltong.xscapebot.tech` on the Hostinger VPS (76.13.196.154).
The app is one compose project at `/docker/bushmanbiltong` with Traefik **labels only** —
the Traefik container itself is never modified. Full instructions: `docs/deployment.md`
(when written) and `docs/ops-runbook.md` (commands).

## Secrets

Never committed. `.env` only. See `.env.example`.

## Owner-supplied values still pending

Product catalogue + real prices (current data is clearly-marked SAMPLE),
pickup location, delivery suburbs/postcodes + fee, notification email, contact details,
story copy, legal review of Privacy page.
