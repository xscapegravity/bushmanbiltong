import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  formatDateTime,
  STATUS_LABELS,
  STATUS_ORDER,
  type OrderStatus,
} from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";
import { addInternalNoteAction, updateStatusAction } from "./actions";

export const dynamic = "force-dynamic";

interface Order {
  id: number;
  order_number: string;
  status: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  fulfilment_method: string;
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  customer_notes: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

interface Item {
  id: number;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

interface HistoryEntry {
  id: number;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  requireAdmin();
  const db = getDb();

  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | Order
    | undefined;
  if (!order) notFound();

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .all(id) as Item[];
  const history = db
    .prepare(
      "SELECT id, previous_status, new_status, changed_at, changed_by FROM order_status_history WHERE order_id = ? ORDER BY changed_at DESC, id DESC"
    )
    .all(id) as HistoryEntry[];

  const isDelivery = order.fulfilment_method === "DELIVERY";

  return (
    <>
      <p>
        <Link href="/admin/orders">← Back to orders</Link>
      </p>
      <div className="admin-detail-header">
        <h1 className="admin-page-title">
          Order {order.order_number} <StatusBadge status={order.status} />
        </h1>
        <p className="admin-page-sub muted">
          Placed {formatDateTime(order.created_at)} · Last updated{" "}
          {formatDateTime(order.updated_at)}
        </p>
      </div>

      <div className="admin-columns">
        <div>
          <section className="admin-card" aria-labelledby="customer-heading">
            <h2 id="customer-heading">Customer</h2>
            <dl className="admin-dl">
              <dt>Name</dt>
              <dd>
                {order.first_name} {order.last_name}
              </dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${order.email}`}>{order.email}</a>
              </dd>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${order.phone}`}>{order.phone}</a>
              </dd>
            </dl>
          </section>

          <section className="admin-card" aria-labelledby="fulfilment-heading">
            <h2 id="fulfilment-heading">Fulfilment</h2>
            <dl className="admin-dl">
              <dt>Method</dt>
              <dd>{isDelivery ? "Delivery" : "Pickup"}</dd>
              {isDelivery && (
                <>
                  <dt>Address</dt>
                  <dd>
                    {order.address_line1}
                    {order.address_line2 ? (
                      <>
                        <br />
                        {order.address_line2}
                      </>
                    ) : null}
                    <br />
                    {order.suburb} {order.state} {order.postcode}
                  </dd>
                </>
              )}
            </dl>
          </section>

          {order.customer_notes ? (
            <section className="admin-card" aria-labelledby="notes-heading">
              <h2 id="notes-heading">Customer notes</h2>
              <p className="prewrap">{order.customer_notes}</p>
            </section>
          ) : null}

          <section className="admin-card" aria-labelledby="status-heading">
            <h2 id="status-heading">Update status</h2>
            <form action={updateStatusAction} className="admin-form">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={order.status}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  Save status
                </button>
              </div>
            </form>
          </section>

          <section className="admin-card" aria-labelledby="internal-heading">
            <h2 id="internal-heading">Internal notes</h2>
            {order.internal_notes ? (
              <div className="note-list">
                {order.internal_notes
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) =>
                    line.startsWith("[") && line.includes("]") ? (
                      <p key={i} className="note-meta">
                        {line.replace(/[\[\]]/g, "")}
                      </p>
                    ) : (
                      <p key={i} className="prewrap">
                        {line}
                      </p>
                    )
                  )}
              </div>
            ) : (
              <p className="muted small">No internal notes yet.</p>
            )}
            <form action={addInternalNoteAction} className="admin-form">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="field">
                <label htmlFor="note">Add note</label>
                <textarea id="note" name="note" rows={3} required></textarea>
              </div>
              <div className="admin-actions">
                <button type="submit" className="btn btn-dark btn-sm">
                  Append note
                </button>
              </div>
            </form>
          </section>
        </div>

        <div>
          <section className="admin-card" aria-labelledby="items-heading">
            <h2 id="items-heading">Items</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <caption className="visually-hidden">Order items</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        {it.product_name_snapshot}
                        <br />
                        <span className="muted small">
                          {it.variant_name_snapshot}
                        </span>
                      </td>
                      <td className="num">{it.quantity}</td>
                      <td className="num">{formatAUD(it.unit_price_cents)}</td>
                      <td className="num">{formatAUD(it.line_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="admin-dl totals">
              <dt>Subtotal</dt>
              <dd className="num">{formatAUD(order.subtotal_cents)}</dd>
              <dt>Delivery fee</dt>
              <dd className="num">{formatAUD(order.delivery_fee_cents)}</dd>
              <dt>
                <strong>Total</strong>
              </dt>
              <dd className="num">
                <strong>{formatAUD(order.total_cents)}</strong>
              </dd>
            </dl>
          </section>

          <section className="admin-card" aria-labelledby="history-heading">
            <h2 id="history-heading">Status history</h2>
            {history.length === 0 ? (
              <p className="muted small">No history.</p>
            ) : (
              <div>
                {history.map((h) => (
                  <div key={h.id} className="history-entry">
                    <StatusBadge status={h.new_status} />
                    <span>
                      {h.previous_status
                        ? `from ${STATUS_LABELS[h.previous_status as OrderStatus] ?? h.previous_status}`
                        : "order placed"}
                    </span>
                    <span className="history-meta">
                      {formatDateTime(h.changed_at)} · by {h.changed_by}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
