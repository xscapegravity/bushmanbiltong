import Link from "next/link";
import { getDb } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type OrderStatus,
} from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders",
};

const PAGE_SIZE = 20;
const FULFILMENT_LABELS: Record<string, string> = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

interface OrderRow {
  id: number;
  order_number: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  fulfilment_method: string;
  total_cents: number;
  created_at: string;
}

function buildWhere(
  q: string,
  status: string,
  fulfilment: string
): { sql: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (q) {
    const like = `%${q}%`;
    clauses.push(
      `(order_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)`
    );
    params.push(like, like, like, like, like);
  }
  if (status) {
    clauses.push(`status = ?`);
    params.push(status);
  }
  if (fulfilment) {
    clauses.push(`fulfilment_method = ?`);
    params.push(fulfilment);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; fulfilment?: string; page?: string };
}) {
  requireAdmin();
  const db = getDb();

  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const status = STATUS_ORDER.includes(searchParams.status as OrderStatus)
    ? (searchParams.status as string)
    : "";
  const fulfilment =
    searchParams.fulfilment === "PICKUP" || searchParams.fulfilment === "DELIVERY"
      ? searchParams.fulfilment
      : "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const { sql, params } = buildWhere(q, status, fulfilment);

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS n FROM orders ${sql}`)
    .get(...params) as { n: number };
  const total = totalRow.n;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const offset = (current - 1) * PAGE_SIZE;

  const orders = db
    .prepare(
      `SELECT id, order_number, status, first_name, last_name, email, phone,
              fulfilment_method, total_cents, created_at
       FROM orders ${sql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset) as OrderRow[];

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (fulfilment) sp.set("fulfilment", fulfilment);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <h1 className="admin-page-title">Orders</h1>
      <p className="admin-page-sub muted">
        {total} order{total === 1 ? "" : "s"} found.
      </p>

      <form method="get" action="/admin/orders" className="admin-toolbar">
        <div className="field field-search">
          <label htmlFor="q">Search</label>
          <input
            id="q"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Order number, name, email or phone"
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fulfilment">Fulfilment</label>
          <select id="fulfilment" name="fulfilment" defaultValue={fulfilment}>
            <option value="">All methods</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>
        <div className="admin-actions">
          <button type="submit" className="btn btn-dark btn-sm">
            Apply
          </button>
          {(q || status || fulfilment) && (
            <Link href="/admin/orders" className="small">
              Clear
            </Link>
          )}
        </div>
      </form>

      <section className="admin-card">
        {orders.length === 0 ? (
          <p className="muted">No orders match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <caption className="visually-hidden">
                Orders, newest first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Fulfilment</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Placed</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.order_number}</strong>
                    </td>
                    <td>
                      {o.first_name} {o.last_name}
                      <br />
                      <span className="muted small">{o.email}</span>
                    </td>
                    <td>{FULFILMENT_LABELS[o.fulfilment_method] ?? o.fulfilment_method}</td>
                    <td className="num">{formatAUD(o.total_cents)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      {new Date(o.created_at).toLocaleString("en-AU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="btn btn-dark btn-sm"
                      >
                        View<span className="visually-hidden"> order {o.order_number}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <nav className="pagination" aria-label="Orders pagination">
            <span className="muted small">
              Page {current} of {pageCount} · {total} orders
            </span>
            <div className="page-links">
              {current > 1 && (
                <Link href={pageHref(current - 1)} rel="prev">
                  ← Previous
                </Link>
              )}
              {current < pageCount && (
                <Link href={pageHref(current + 1)} rel="next">
                  Next →
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </>
  );
}
