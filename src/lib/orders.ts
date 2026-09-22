import { getDb } from "./db";
import { config } from "./config";
import { checkDeliveryEligibility } from "./delivery";
import { computeTotals, formatAUD } from "./money";

/**
 * Order creation — all validation and price calculation happens here,
 * server-side, inside a single transaction. Client data is never trusted.
 */

export interface OrderInput {
  items: { variantId: number; quantity: number }[];
  fulfilmentMethod: "PICKUP" | "DELIVERY";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  customerNotes?: string;
}

export interface OrderResult {
  ok: true;
  orderNumber: string;
  order: {
    orderNumber: string;
    items: {
      productName: string;
      variantName: string;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }[];
    subtotalCents: number;
    deliveryFeeCents: number;
    totalCents: number;
  };
}

export type OrderError =
  | { ok: false; error: "validation"; message: string; field?: string }
  | { ok: false; error: "unavailable"; message: string }
  | { ok: false; error: "delivery"; message: string }
  | { ok: false; error: "internal"; message: string };

function nextOrderNumber(db: ReturnType<typeof getDb>): string {
  const row = db
    .prepare("UPDATE counters SET value = value + 1 WHERE name = 'order_number' RETURNING value")
    .get() as { value: number } | undefined;
  if (!row) throw new Error("counter missing");
  return `BB-${row.value}`;
}

export function createOrder(input: OrderInput): OrderResult | OrderError {
  const db = getDb();

  // --- Basic field validation ---
  const fieldErrors: string[] = [];
  if (!input.firstName?.trim()) fieldErrors.push("First name is required.");
  if (!input.lastName?.trim()) fieldErrors.push("Last name is required.");
  if (!/^[0-9+\-\s()]{6,20}$/.test(input.phone ?? "")) fieldErrors.push("A valid mobile number is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email ?? "")) fieldErrors.push("A valid email address is required.");

  let deliveryFeeCents = 0;
  if (input.fulfilmentMethod === "DELIVERY") {
    if (!input.addressLine1?.trim()) fieldErrors.push("Street address is required for delivery.");
    if (!input.suburb?.trim()) fieldErrors.push("Suburb is required for delivery.");
    if (!input.state?.trim()) fieldErrors.push("State is required for delivery.");
    if (!input.postcode?.trim()) fieldErrors.push("Postcode is required for delivery.");
    if (fieldErrors.length === 0) {
      const check = checkDeliveryEligibility(input.postcode!, input.suburb);
      if (!check.eligible) {
        return { ok: false, error: "delivery", message: check.reason ?? "Delivery unavailable." };
      }
    }
  } else if (input.fulfilmentMethod !== "PICKUP") {
    return { ok: false, error: "validation", message: "Choose pickup or delivery." };
  }

  if (fieldErrors.length > 0) {
    return { ok: false, error: "validation", message: fieldErrors.join(" ") };
  }

  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "validation", message: "Your order is empty." };
  }

  try {
    const result = db.transaction(() => {
      // --- Load and verify every variant inside the transaction ---
      const variantStmt = db.prepare(
        `SELECT v.id, v.label, v.price_cents, v.active, v.weight_grams,
                p.id AS product_id, p.name AS product_name, p.active AS product_active
         FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE v.id = ?`
      );

      const lines: {
        productId: number; variantId: number; productName: string; variantName: string;
        unitPriceCents: number; quantity: number; lineTotalCents: number;
      }[] = [];
      const merged = new Map<number, number>();
      for (const it of input.items) {
        const vid = Number(it.variantId);
        const qty = Number(it.quantity);
        if (!Number.isInteger(vid) || vid <= 0) throw Object.assign(new Error("Invalid product selection."), { code: "validation" });
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw Object.assign(new Error("Quantity must be between 1 and 99."), { code: "validation" });
        merged.set(vid, (merged.get(vid) ?? 0) + qty);
      }

      for (const [vid, qty] of merged) {
        const v = variantStmt.get(vid) as
          | { id: number; label: string; price_cents: number; active: number; weight_grams: number | null; product_id: number; product_name: string; product_active: number }
          | undefined;
        if (!v || !v.active || !v.product_active) {
          throw Object.assign(new Error("Sorry, one of the items in your order is no longer available."), { code: "unavailable" });
        }
        lines.push({
          productId: v.product_id,
          variantId: v.id,
          productName: v.product_name,
          variantName: v.label,
          unitPriceCents: v.price_cents,
          quantity: qty,
          lineTotalCents: v.price_cents * qty,
        });
      }

      // --- Minimum order check for delivery ---
      if (input.fulfilmentMethod === "DELIVERY" && config.delivery.minOrderCents > 0) {
        const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
        if (subtotal < config.delivery.minOrderCents) {
          throw Object.assign(new Error(`Delivery requires a minimum order of ${formatAUD(config.delivery.minOrderCents)}.`), { code: "delivery" });
        }
      }

      // --- Delivery fee (free over threshold) ---
      if (input.fulfilmentMethod === "DELIVERY") {
        const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
        const { freeThresholdCents, feeCents } = config.delivery;
        if (freeThresholdCents > 0 && subtotal >= freeThresholdCents) {
          deliveryFeeCents = 0;
        } else {
          deliveryFeeCents = feeCents;
        }
        if (subtotal === 0) {
          throw Object.assign(new Error("Your order is empty."), { code: "validation" });
        }
        if (subtotal === 0 && feeCents === 0) {
          // unreachable guard, kept for clarity
        }
      }

      const totals = computeTotals(lines, deliveryFeeCents);

      // --- Allocate order number + insert order, items, history atomically ---
      const orderNumber = nextOrderNumber(db);
      const info = db.prepare(
        `INSERT INTO orders (order_number, status, first_name, last_name, phone, email,
           fulfilment_method, address_line1, address_line2, suburb, state, postcode,
           subtotal_cents, delivery_fee_cents, total_cents, customer_notes)
         VALUES (?, 'NEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderNumber, input.firstName.trim(), input.lastName.trim(), input.phone.trim(), input.email.trim(),
        input.fulfilmentMethod,
        input.fulfilmentMethod === "DELIVERY" ? input.addressLine1?.trim() ?? null : null,
        input.fulfilmentMethod === "DELIVERY" ? null2(input.addressLine2) : null,
        null2(input.suburb), null2(input.state), null2(input.postcode),
        totals.subtotalCents, totals.deliveryFeeCents, totals.totalCents,
        (input.customerNotes ?? "").trim()
      );

      const orderId = Number(info.lastInsertRowid);
      const itemStmt = db.prepare(
        `INSERT INTO order_items (order_id, product_id, variant_id,
           product_name_snapshot, variant_name_snapshot, unit_price_cents, quantity, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const l of lines) {
        itemStmt.run(orderId, l.productId, l.variantId, l.productName, l.variantName, l.unitPriceCents, l.quantity, l.lineTotalCents);
      }

      db.prepare(
        "INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by) VALUES (?, NULL, 'NEW', 'customer')"
      ).run(orderId);

      return { orderNumber, lines, totals };
    })();

    return {
      ok: true,
      orderNumber: result.orderNumber,
      order: {
        orderNumber: result.orderNumber,
        items: result.lines.map((l) => ({
          productName: l.productName, variantName: l.variantName,
          unitPriceCents: l.unitPriceCents, quantity: l.quantity, lineTotalCents: l.lineTotalCents,
        })),
        subtotalCents: result.totals.subtotalCents,
        deliveryFeeCents: result.totals.deliveryFeeCents,
        totalCents: result.totals.totalCents,
      },
    };
  } catch (err: any) {
    if (err?.code === "validation" || err?.code === "unavailable" || err?.code === "delivery") {
      return { ok: false, error: err.code, message: err.message };
    }
    console.error("[order] creation failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal", message: "Something went wrong while placing your order. Please try again." };
  }
}

function null2(v?: string): string | null {
  const t = v?.trim();
  return t ? t : null;
}
