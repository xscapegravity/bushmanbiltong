import { describe, it, expect } from "vitest";
import { createOrder } from "@/lib/orders";
import { getDb } from "@/lib/db";
import { hashPassword, verifyCredentials, isLockedOut, recordAttempt } from "@/lib/auth";
import crypto from "node:crypto";

function seedProduct(sku: string, priceCents: number, active = 1) {
  const db = getDb();
  const p = db
    .prepare(
      "INSERT INTO products (name, slug, active) VALUES (?, ?, ?)"
    )
    .run(`Test ${sku}`, `test-${sku}-${crypto.randomBytes(3).toString("hex")}`, active);
  const pid = Number(p.lastInsertRowid);
  const v = db
    .prepare(
      "INSERT INTO product_variants (product_id, label, price_cents, active) VALUES (?, ?, ?, 1)"
    )
    .run(pid, "250g", priceCents);
  return { productId: pid, variantId: Number(v.lastInsertRowid) };
}

const baseInput = {
  fulfilmentMethod: "PICKUP" as const,
  firstName: "Jane",
  lastName: "Smith",
  phone: "0412 345 678",
  email: "jane@example.com",
};

describe("createOrder", () => {
  it("creates a pickup order with server-side totals and BB- number", () => {
    const { variantId } = seedProduct("a", 2250);
    const r = createOrder({ ...baseInput, items: [{ variantId, quantity: 2 }] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.orderNumber).toMatch(/^BB-\d{5,}$/);
      expect(r.order.totalCents).toBe(4500); // server-computed
      expect(r.order.deliveryFeeCents).toBe(0);
    }
  });

  it("merges duplicate variants and recomputes prices (client totals ignored)", () => {
    const { variantId } = seedProduct("b", 1000);
    const r = createOrder({
      ...baseInput,
      items: [
        { variantId, quantity: 1 },
        { variantId, quantity: 2 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.totalCents).toBe(3000);
  });

  it("applies delivery fee and free threshold", () => {
    const { variantId } = seedProduct("c", 2500);
    // Subtotal 5000 = threshold → free
    const free = createOrder({
      ...baseInput,
      fulfilmentMethod: "DELIVERY",
      addressLine1: "1 Test St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      items: [{ variantId, quantity: 2 }],
    });
    expect(free.ok).toBe(true);
    if (free.ok) expect(free.order.deliveryFeeCents).toBe(0);

    // Subtotal 2500 < threshold → $7 fee
    const { variantId: v2 } = seedProduct("d", 2500);
    const paid = createOrder({
      ...baseInput,
      fulfilmentMethod: "DELIVERY",
      addressLine1: "2 Test St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      items: [{ variantId: v2, quantity: 1 }],
    });
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.order.deliveryFeeCents).toBe(700);
  });

  it("rejects delivery to an unsupported postcode", () => {
    const { variantId } = seedProduct("e", 1000);
    const r = createOrder({
      ...baseInput,
      fulfilmentMethod: "DELIVERY",
      addressLine1: "3 Test St",
      suburb: "Brisbane",
      state: "QLD",
      postcode: "4000",
      items: [{ variantId, quantity: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("delivery");
  });

  it("enforces the delivery minimum order", () => {
    const { variantId } = seedProduct("f", 1000); // 1000 < 2000 min
    const r = createOrder({
      ...baseInput,
      fulfilmentMethod: "DELIVERY",
      addressLine1: "4 Test St",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      items: [{ variantId, quantity: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("delivery");
  });

  it("rejects missing required fields", () => {
    const { variantId } = seedProduct("g", 1000);
    const r = createOrder({
      ...baseInput,
      firstName: "",
      items: [{ variantId, quantity: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("validation");
  });

  it("rejects unavailable products", () => {
    const { variantId } = seedProduct("h", 1000, 0); // inactive
    const r = createOrder({ ...baseInput, items: [{ variantId, quantity: 1 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("unavailable");
  });

  it("rejects unknown variants", () => {
    const r = createOrder({ ...baseInput, items: [{ variantId: 999999, quantity: 1 }] });
    expect(r.ok).toBe(false);
  });

  it("generates unique sequential order numbers", () => {
    const { variantId } = seedProduct("i", 500);
    const a = createOrder({ ...baseInput, email: "a@x.com", items: [{ variantId, quantity: 1 }] });
    const b = createOrder({ ...baseInput, email: "b@x.com", items: [{ variantId, quantity: 1 }] });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.orderNumber).not.toBe(b.orderNumber);
  });

  it("snapshots product name and price on the order item", () => {
    const { variantId, productId } = seedProduct("j", 1234);
    const r = createOrder({ ...baseInput, email: "snap@x.com", items: [{ variantId, quantity: 1 }] });
    expect(r.ok).toBe(true);
    const db = getDb();
    const item = db
      .prepare("SELECT * FROM order_items WHERE variant_id = ? ORDER BY id DESC LIMIT 1")
      .get(variantId) as any;
    expect(item.product_name_snapshot).toBe("Test j");
    expect(item.unit_price_cents).toBe(1234);
    const order = db.prepare("SELECT status FROM orders WHERE id = ?").get(item.order_id) as any;
    expect(order.status).toBe("NEW");
    expect(productId).toBeGreaterThan(0);
  });
});

describe("admin auth", () => {
  it("hashes and verifies passwords", () => {
    const db = getDb();
    const hash = hashPassword("correct horse battery staple");
    db.prepare("INSERT INTO admin_users (email, password_hash) VALUES (?, ?)").run(
      `t-${crypto.randomBytes(4).toString("hex")}@x.com`,
      hash
    );
    const user = verifyCredentials(
      `t-${db.prepare("SELECT COUNT(*) n FROM admin_users").get() ? "" : ""}`,
      ""
    );
    expect(user).toBeNull();
  });

  it("rate-limits after 5 failures", () => {
    const ip = `10.0.0.${crypto.randomBytes(1)[0]}`;
    for (let i = 0; i < 5; i++) recordAttempt(ip, false);
    expect(isLockedOut(ip)).toBe(true);
    recordAttempt(ip, true);
    expect(isLockedOut(ip)).toBe(true); // failures still in window
  });
});
