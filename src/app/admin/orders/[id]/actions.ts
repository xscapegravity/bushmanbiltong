"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { STATUS_ORDER, type OrderStatus } from "@/lib/status";

/**
 * Order detail mutations. Every action re-validates the admin session
 * server-side before touching the database.
 */

function nowStamp(): string {
  return new Date().toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function updateStatusAction(formData: FormData): Promise<void> {
  const admin = requireAdmin();
  const db = getDb();

  const orderId = Number(formData.get("orderId"));
  const nextStatus = String(formData.get("status") ?? "");
  if (!Number.isInteger(orderId) || orderId <= 0) return;
  if (!STATUS_ORDER.includes(nextStatus as OrderStatus)) return;

  const order = db
    .prepare("SELECT id, status FROM orders WHERE id = ?")
    .get(orderId) as { id: number; status: string } | undefined;
  if (!order || order.status === nextStatus) return;

  const setStatus = db.transaction(() => {
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(
      nextStatus,
      new Date().toISOString(),
      orderId
    );
    db.prepare(
      "INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?)"
    ).run(orderId, order.status, nextStatus, admin.email);
  });
  setStatus();

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function addInternalNoteAction(formData: FormData): Promise<void> {
  const admin = requireAdmin();
  const db = getDb();

  const orderId = Number(formData.get("orderId"));
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(orderId) || orderId <= 0) return;
  if (!note) return;
  const stamp = nowStamp();
  const entry = `[${stamp} — ${admin.email}]\n${note}\n`;

  db.prepare(
    "UPDATE orders SET internal_notes = CASE WHEN internal_notes = '' THEN ? ELSE internal_notes || char(10) || ? END, updated_at = ? WHERE id = ?"
  ).run(entry, entry, new Date().toISOString(), orderId);

  revalidatePath(`/admin/orders/${orderId}`);
}
