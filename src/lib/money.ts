/** Money helpers — integer cents everywhere. Never floats. */

export function formatAUD(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Recompute an order's totals from line items. Single source of truth. */
export function computeTotals(
  items: { unitPriceCents: number; quantity: number }[],
  deliveryFeeCents: number
): { subtotalCents: number; deliveryFeeCents: number; totalCents: number } {
  const subtotalCents = items.reduce(
    (sum, i) => sum + i.unitPriceCents * i.quantity,
    0
  );
  const totalCents = subtotalCents + deliveryFeeCents;
  return { subtotalCents, deliveryFeeCents, totalCents };
}
