/**
 * Shared order status vocabulary: canonical order, friendly labels,
 * and badge colour classes (used by StatusBadge).
 */

export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export const STATUS_ORDER: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Badge colour classes (defined in globals.css):
 * green = ready/completed, amber = new/preparing, red = cancelled, grey = others.
 */
export const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  NEW: "badge-amber",
  CONFIRMED: "badge-grey",
  PREPARING: "badge-amber",
  READY_FOR_PICKUP: "badge-green",
  OUT_FOR_DELIVERY: "badge-grey",
  COMPLETED: "badge-green",
  CANCELLED: "badge-red",
};

export const FULFILMENT_LABELS: Record<string, string> = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] ?? status;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
