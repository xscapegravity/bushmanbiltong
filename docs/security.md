# Security Notes — Bushman Biltong v1

Scope: v1 as decided in plan/bushmanbiltong-v1.md (no online payment, no customer accounts).

## Implemented

- **Passwords:** scrypt (N=16384, r=8, p=1), random 16-byte salt, constant-time
  comparison (`crypto.timingSafeEqual`). No plaintext ever stored or logged.
- **Sessions:** opaque 32-byte random tokens; only SHA-256 hashes stored in
  `admin_sessions`; cookie `bb_admin` HttpOnly + SameSite=Lax + Secure (production);
  expiry enforced server-side; logout deletes the session row.
- **Brute force:** `login_attempts` table, 5 failures / 15 min / IP → lockout;
  generic error text (no user enumeration).
- **SQL injection:** all queries parameterized via better-sqlite3 prepared statements.
- **XSS:** React auto-escaping; no `dangerouslySetInnerHTML` anywhere.
- **Server-side money:** totals, delivery fee, free-threshold and minimum order are
  recomputed inside the order transaction — client-submitted prices are ignored.
- **Availability:** variant + product `active` flags verified inside the transaction;
  duplicates merged; quantity 1–99 enforced.
- **Delivery rules:** server-side postcode/suburb validation (`src/lib/delivery.ts`).
- **Order integrity:** order number allocation + order + items + status history in
  one SQLite transaction; `CHECK` constraints on status/method/quantity.
- **Headers:** nosniff, DENY framing, referrer-policy, permissions-policy
  (next.config.mjs); CSRF surface limited by SameSite=Lax cookie + POST-only
  server actions.
- **Secrets:** only via env; `.env*` gitignored; `.env.example` has placeholders.
- **PII:** orders store only what fulfilment needs; logs carry no passwords/tokens;
  errors returned to users are generic — details go to server logs only.
- **Data dir:** `data/` gitignored — customer data can't be committed.

## Known gaps (accepted for v1)

- No CSRF tokens: mitigated by SameSite=Lax + all mutations via POST server actions;
  revisit if cross-site form posting becomes a requirement.
- No HTTPS enforcement at app level (Traefik redirects HTTP→HTTPS on the VPS).
- Login rate limit is per-IP only; behind Traefik the app sees the proxy IP unless
  `x-forwarded-for` is honored (login action reads it; verify on deploy).
- No 2FA on admin (single-admin v1).
- Privacy page is a template pending legal review.

## Review checklist used (spec §24)

input validation ✓ output encoding ✓ SQLi ✓ XSS ✓ authN ✓ session ✓ brute force ✓
password storage ✓ headers ✓ env secrets ✓ admin protection ✓ server-side prices ✓
server-side delivery rules ✓ no stack traces ✓ no secret logging ✓
