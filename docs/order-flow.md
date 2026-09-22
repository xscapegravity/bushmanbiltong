# Order Flow — Bushman Biltong

## Customer journey

```
Home / Order Now
   └─► /order  (mobile-first, single page)
         ├─ pick products: variant (100g/250g/…) + quantity stepper
         ├─ order summary: items, subtotal, delivery fee, total
         │    (display-only; server recalculates everything)
         ├─ fulfilment: Pickup  |  Local Delivery
         │    ├─ Pickup → name/address/instructions shown (from config)
         │    └─ Delivery → address fields; postcode checked
         │         against server-side allowlist while typing (UX) and
         │         again at submit (truth)
         ├─ customer details: first/last name, mobile, email, notes
         └─ Submit ──POST──► server action
```

## Server action (`/order/actions.ts` → `createOrder`)

1. Field validation (names, AU phone pattern, email pattern).
2. If DELIVERY: address required + `checkDeliveryEligibility(postcode, suburb)`.
3. Transaction:
   - every variant re-verified active (product + variant)
   - duplicate variant lines merged; quantity clamped 1–99
   - unit prices read from DB only — client totals ignored
   - delivery fee applied / waived above free-threshold (from config)
   - delivery minimum-order enforced
   - `BB-10001` allocated from `counters` (atomic `UPDATE … RETURNING`)
   - INSERT order (status NEW) + items (name/price snapshots) + status history
4. Redirect → `/order/confirmation?n=BB-10001` (POST-redirect-GET: refresh-safe).

## Confirmation page

Reads the order by number; shows items, totals, fulfilment details, customer
details, next steps ("we'll contact you to confirm and arrange payment"), and the
notice: **No payment is required online at this stage…** Unknown number → friendly
not-found message.

## Status lifecycle (admin)

```
NEW → CONFIRMED → PREPARING → READY_FOR_PICKUP ─► COMPLETED
                           └► OUT_FOR_DELIVERY ─┘
any → CANCELLED
```
Every transition writes `order_status_history` (previous, new, when, who).
Friendly labels everywhere; raw enums never shown to users.

## Emails (v1: stubbed)

`getMailer()` returns NullMailer. When enabled later:
- owner notification on NEW (order number, customer, contact, items, total,
  fulfilment, notes, admin link)
- customer confirmation (branded, order contents, no-payment-taken note)
Email failure is caught + logged; the order itself is already safe.
