# Bushman Biltong — v1 Implementation Plan

Status: APPROVED (grill-me interview completed 2026-09-22)
Repo: `C:\Users\marty\OneDrive\00. Git\bushmanbiltong` (→ github.com/xscapegravity/bushmanbiltong, private)

## Decisions (from grill-me)

| # | Decision | Choice | Spec deviation |
|---|---|---|---|
| 1 | Hosting | Hostinger VPS srv1383735 (76.13.196.154), Docker Compose + Traefik | §37 Codex/Sites → VPS |
| 2 | Temp home here.now | Superseded — straight to VPS | — |
| 3 | Database | SQLite via better-sqlite3, raw SQL, volume-mounted file, integer cents | — |
| 4 | Framework | Next.js 14+ / TypeScript / server actions | as spec |
| 5 | Email | NONE in v1 — admin dashboard is the order inbox; `lib/email/` interface stubbed for later | §15 deliberately dropped |
| 6 | Domain | Deploy to `bushmanbiltong.xscapebot.tech` (verified → 76.13.196.154); bushmanbiltong.com owned by a friend, DNS records documented only, no changes | §37 partial |
| 7 | Images | 17 real Drive assets already in `assets/` (15 photos + 2 videos) | §5 satisfied |
| 8 | Money | Integer cents; totals computed server-side; no payment in v1 | as spec |
| 9 | Traefik | NEVER modify the traefik container/compose. App gets its own compose project with Traefik labels only | hard constraint |
| 10 | Repo | Private xscapegravity/bushmanbiltong; plans in `plan/` | — |

## Architecture

- One compose project at `/docker/bushmanbiltong/` on the VPS: app container (Next.js standalone build) + named volume `bb-data` mounting `/app/data` (SQLite file + uploaded images if any).
- Traefik labels on the app container: Host(`bushmanbiltong.xscapebot.tech`) → port 3000, TLS via existing Let's Encrypt resolver (certs managed by the existing Traefik instance).
- DB: `data/biltong.db`. WAL mode. Migrations = numbered plain-SQL files in `migrations/`, applied by a tiny TS runner at container start (before serving).
- Auth: single admin, session cookie (HttpOnly, SameSite=Lax, Secure), scrypt password hashing (node crypto — no extra dep), login rate-limit in SQLite table.
- Server actions for all writes (order create, admin mutations). Never trust client totals — recompute from DB.
- Order numbers: `BB-10001`+ from a counter table, allocated in the same transaction as order insert.
- Email: `lib/email/mailer.ts` interface + `NullMailer` in v1. Resend adapter later = one file.

## Data model (SQLite)

products, product_variants, orders, order_items, order_status_history, admin_users, admin_sessions, login_attempts, settings (kv: pickup config, delivery postcodes/fee, notification email placeholder), counters (order numbers). Snapshots of product/variant name + unit price on order_items.

## Phases

1. ✅ Discovery (VPS verified: Traefik up 3 months, precedent apps on port 3000, Ubuntu 24.04)
2. Foundation: scaffold, styling (charcoal/cream premium deli), layout, nav, footer
3. Public: Home, Order, Contact, Privacy (placeholder copy marked TODO-OWNER)
4. Ordering: products/variants, qty, summary, pickup/delivery config from settings, server-side validation + totals, order create, confirmation (BB-xxxxx)
5. Admin: login, dashboard, order list/search/filter, order detail, status transitions + history, notes, product/variant CRUD
6. (Email stub only)
7. Tests: vitest unit (pricing, delivery eligibility, order numbers) + Playwright E2E (customer flow, admin flow)
8. UX review at 360/390/768/1024/1440
9. Security review (§24 checklist)
10. Deploy: build image, rsync compose file, `docker compose up -d`, verify URL, docs

## Deployment target

`https://bushmanbiltong.xscapebot.tech` — Traefik-routed, automatic TLS. bushmanbiltong.com cutover documented in docs/deployment.md (A record + Traefik Host label change) — requires owner approval, not automatic.

## Owner-supplied values still pending (§42)

Product catalogue + prices (sample data marked SAMPLE), notification email, pickup location, delivery suburbs/fees, contact info, story copy, Instagram-select hero image.
