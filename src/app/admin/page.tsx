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
  title: "Dashboard",
};

const OPEN_STATUSES: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
];

interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  total_cents: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const admin = requireAdmin();
  const db = getDb();

  const countRows = db
    .prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status")
    .all() as { status: string; n: number }[];
  const counts = new Map(countRows.map((r) => [r.status, r.n]));
  const get = (s: OrderStatus) => counts.get(s) ?? 0;

  const recent = db
    .prepare(
      `SELECT id, order_number, status, first_name, last_name, email, total_cents, created_at
       FROM orders ORDER BY created_at DESC, id DESC LIMIT 10`
    )
    .all() as RecentOrder[];

  const openCount = OPEN_STATUSES.reduce((s, st) => s + get(st), 0);

  return (
    <>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub muted">
        Signed in as {admin.email}. {openCount} open order
        {openCount === 1 ? " needs" : "s need"} attention.
      </p>

      <section aria-labelledby="status-counts-heading">
        <h2 id="status-counts-heading" className="visually-hidden">
          Orders by status
        </h2>
        <div className="admin-grid">
          {STATUS_ORDER.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className="stat-card"
            >
              <span className="stat-value">{get(s)}</span>
              <span className="stat-label">{STATUS_LABELS[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-card" aria-labelledby="recent-heading">
        <h2 id="recent-heading">Recent orders</h2>
        {recent.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <caption className="visually-hidden">
                Ten most recent orders
              </caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Placed</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.order_number}</strong>
                    </td>
                    <td>
                      {o.first_name} {o.last_name}
                      <br />
                      <span className="muted small">{o.email}</span>
                    </td>
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
      </section>
    </>
  );
}
