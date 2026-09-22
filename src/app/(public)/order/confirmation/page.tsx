import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { config } from "@/lib/config";
import { formatAUD } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface OrderRow {
  id: number;
  order_number: string;
  status: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  fulfilment_method: "PICKUP" | "DELIVERY";
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  customer_notes: string;
  created_at: string;
}

interface ItemRow {
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

const NOTICE_TEXT =
  "No payment is required online at this stage. We will confirm your order and payment arrangements after your order is received.";

function loadOrder(orderNumber: string): { order: OrderRow; items: ItemRow[] } | null {
  const db = getDb();
  const order = db
    .prepare(`SELECT * FROM orders WHERE order_number = ?`)
    .get(orderNumber) as OrderRow | undefined;
  if (!order) return null;
  const items = db
    .prepare(
      `SELECT product_name_snapshot, variant_name_snapshot, unit_price_cents,
              quantity, line_total_cents
       FROM order_items WHERE order_id = ? ORDER BY id`
    )
    .all(order.id) as ItemRow[];
  return { order, items };
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }> | { n?: string };
}) {
  const params = await searchParams;
  const orderNumber = (params?.n ?? "").trim();
  const found = orderNumber ? loadOrder(orderNumber) : null;

  if (!found) {
    return (
      <div className="container section" style={{ paddingTop: 48 }}>
        <h1 style={{ marginTop: 0 }}>Order not found</h1>
        <p className="muted">
          We couldn&apos;t find an order with that reference. If you just placed
          an order, please check the link or order number in your confirmation
          details.
        </p>
        <p>
          <Link href="/order" className="btn btn-primary">
            Back to ordering
          </Link>
        </p>
      </div>
    );
  }

  const { order, items } = found;
  const isPickup = order.fulfilment_method === "PICKUP";

  return (
    <div className="container section" style={{ paddingTop: 48, maxWidth: 760 }}>
      <p className="eyebrow">Thank you</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginTop: 0 }}>
        Thanks, {order.first_name} — your order is in!
      </h1>
      <p className="muted" style={{ fontSize: "1.05rem" }}>
        Your order number is{" "}
        <strong style={{ color: "var(--terra)" }}>{order.order_number}</strong>.
        Keep it handy — we&apos;ll use it when we contact you.
      </p>

      <div className="notice" style={{ margin: "24px 0" }}>
        {NOTICE_TEXT}
      </div>

      <section aria-labelledby="conf-items-heading" style={{ marginBottom: 40 }}>
        <h2 id="conf-items-heading" style={{ fontSize: "1.4rem", marginBottom: 16 }}>
          Your order
        </h2>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "#fff",
            padding: 20,
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((it, i) => (
              <li
                key={i}
                className="small"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span>
                  {it.quantity} × {it.product_name_snapshot} (
                  {it.variant_name_snapshot}) @ {formatAUD(it.unit_price_cents)}
                </span>
                <span>{formatAUD(it.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <div className="small" style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <span>Subtotal</span>
            <span>{formatAUD(order.subtotal_cents)}</span>
          </div>
          <div className="small" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{isPickup ? "Pickup" : "Delivery fee"}</span>
            <span>
              {isPickup
                ? "—"
                : order.delivery_fee_cents === 0
                  ? "FREE"
                  : formatAUD(order.delivery_fee_cents)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 10,
              borderTop: "2px solid var(--line)",
              fontWeight: 700,
              fontSize: "1.15rem",
            }}
          >
            <span>Total</span>
            <span>{formatAUD(order.total_cents)}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="conf-fulfilment-heading" style={{ marginBottom: 40 }}>
        <h2 id="conf-fulfilment-heading" style={{ fontSize: "1.4rem", marginBottom: 16 }}>
          {isPickup ? "Pickup details" : "Delivery details"}
        </h2>
        <div className="notice">
          {isPickup ? (
            <>
              <strong>{config.pickup.name || "Pickup"}</strong>
              {config.pickup.address && (
                <>
                  <br />
                  {config.pickup.address}
                </>
              )}
              {config.pickup.instructions && (
                <>
                  <br />
                  <span className="small muted">{config.pickup.instructions}</span>
                </>
              )}
            </>
          ) : (
            <>
              <strong>{order.first_name} {order.last_name}</strong>
              <br />
              {order.address_line1}
              {order.address_line2 && (
                <>
                  <br />
                  {order.address_line2}
                </>
              )}
              <br />
              {[order.suburb, order.state, order.postcode].filter(Boolean).join(" ")}
              {config.delivery.instructions && (
                <>
                  <br />
                  <span className="small muted">{config.delivery.instructions}</span>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="conf-customer-heading" style={{ marginBottom: 40 }}>
        <h2 id="conf-customer-heading" style={{ fontSize: "1.4rem", marginBottom: 16 }}>
          Your details
        </h2>
        <p style={{ margin: 0 }}>
          {order.first_name} {order.last_name}
          <br />
          <span className="small muted">
            {order.phone}
            <br />
            {order.email}
          </span>
        </p>
        {order.customer_notes && (
          <p className="small muted" style={{ marginTop: 12 }}>
            <strong>Your notes:</strong> {order.customer_notes}
          </p>
        )}
      </section>

      <section aria-labelledby="conf-next-heading">
        <h2 id="conf-next-heading" style={{ fontSize: "1.4rem", marginBottom: 16 }}>
          What happens next
        </h2>
        <ol style={{ paddingLeft: 20 }}>
          <li>We&apos;ll contact you to confirm your order and arrange payment.</li>
          <li>
            {isPickup
              ? "Once confirmed, we'll let you know when your order is ready for pickup."
              : "Once confirmed, we'll arrange delivery to your address."}
          </li>
          <li>Payment is settled after confirmation — nothing is charged online now.</li>
        </ol>
        <p>
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
        </p>
      </section>
    </div>
  );
}
