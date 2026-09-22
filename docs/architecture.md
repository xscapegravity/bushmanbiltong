# Architecture — Bushman Biltong v1

Companion to plan/bushmanbiltong-v1.md (decisions) and docs/security.md.

## Layers

```
Browser ── HTTPS ── Traefik (existing, never modified)
                        │ host: bushmanbiltong.xscapebot.tech → :3000
                        ▼
              Next.js standalone container (app)
   ┌────────────┬──────────────────┬─────────────┐
   │ (public)/* │ server actions   │ admin/*     │
   │ RSC pages  │ (mutations)      │ pages       │
   └─────┬──────┴────────┬─────────┴──────┬──────┘
         │  import        │ import         │ requireAdmin()
         ▼                ▼                ▼
   src/lib domain core: config · db · money · delivery · auth · orders · email
                        │
                        ▼
             SQLite (better-sqlite3, WAL) at /app/data/biltong.db
             (named docker volume bb-data; survives rebuilds)
```

## Key decisions

1. **One container.** Next.js standalone serves pages AND server actions. No
   separate API server. SQLite is embedded — no DB service to run.
2. **Raw SQL over an ORM.** better-sqlite3 is synchronous, fast, and has no codegen
   step. Queries live next to the logic that uses them; migrations are plain SQL
   files applied in order and recorded in a `migrations` table.
3. **Money = integer cents.** No floats. `formatAUD` only at render time. Admin
   inputs are dollars and converted once at the boundary (`dollarsToCents`).
4. **Server actions for all writes.** Forms post to server actions; the action calls
   domain functions (`createOrder`, admin mutations) which re-validate everything.
   Prices/fees never come from the client.
5. **POST-redirect-GET confirmation.** The order action redirects to
   `/order/confirmation?n=BB-xxxxx`, which reads the order from the DB — refresh-safe,
   no duplicated submissions.
6. **Email is an interface** (`src/lib/email.ts`) with a NullMailer in v1. Adding
   Resend later = one adapter file + `EMAIL_PROVIDER=resend` + DNS records.
7. **Admin auth** = scrypt + opaque session tokens (hashed at rest) + per-IP
   lockout. Middleware does a cheap cookie-presence redirect; every admin page and
   action re-checks the session against the DB (`requireAdmin`).
8. **Traefik untouched.** The app joins the existing `traefik` docker network and
   advertises itself with labels. Routing/TLS/certs remain owned by the existing
   Traefik compose project.

## Data flow: placing an order

```
OrderForm (client) → POST server action → zod-lite field checks
  → createOrder():
      transaction BEGIN
        verify each variant active (SELECT … JOIN products)
        merge duplicate variants
        compute subtotal/delivery fee/total (integer cents)
        enforce delivery eligibility + minimum order
        UPDATE counters RETURNING → BB-10001
        INSERT orders / order_items (snapshots) / order_status_history
      transaction COMMIT
  → redirect /order/confirmation?n=BB-xxxxx
```

## Backups

`bb-data` volume holds the single SQLite file. Backup = copy `biltong.db`
(WAL-aware: use `sqlite3 biltong.db ".backup '…'"` or stop-then-copy).
Documented in docs/deployment.md; orders are never stored in the container layer.
