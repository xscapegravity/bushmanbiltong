/**
 * Applies migrations and inserts clearly-marked SAMPLE data.
 * Sample products are ALWAYS labelled so they can't be mistaken for the
 * real catalogue. Run: npm run db:seed
 */
import { getDb } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import crypto from "node:crypto";

const db = getDb();

const SAMPLE_PRODUCTS = [
  {
    name: "Traditional Biltong [SAMPLE]",
    slug: "traditional-biltong-sample",
    description:
      "Classic air-dried biltong with coriander and black pepper. SAMPLE PRODUCT — replace with the real catalogue.",
    featured: 1,
    display_order: 1,
    variants: [
      { label: "100g", weight_grams: 100, price_cents: 1000 },
      { label: "250g", weight_grams: 250, price_cents: 2250 },
      { label: "500g", weight_grams: 500, price_cents: 4200 },
      { label: "1kg", weight_grams: 1000, price_cents: 8000 },
    ],
  },
  {
    name: "Chilli Biltong [SAMPLE]",
    slug: "chilli-biltong-sample",
    description:
      "Biltong with a warm chilli kick. SAMPLE PRODUCT — replace with the real catalogue.",
    featured: 1,
    display_order: 2,
    variants: [
      { label: "100g", weight_grams: 100, price_cents: 1100 },
      { label: "250g", weight_grams: 250, price_cents: 2500 },
    ],
  },
  {
    name: "Garlic Biltong [SAMPLE]",
    slug: "garlic-biltong-sample",
    description:
      "Rich roasted-garlic biltong. SAMPLE PRODUCT — replace with the real catalogue.",
    featured: 0,
    display_order: 3,
    variants: [
      { label: "100g", weight_grams: 100, price_cents: 1050 },
      { label: "250g", weight_grams: 250, price_cents: 2400 },
    ],
  },
];

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (email && password) {
  const hash = hashPassword(password);
  const existing = db
    .prepare("SELECT id FROM admin_users WHERE email = ?")
    .get(email);
  if (existing) {
    db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(hash, (existing as any).id);
    console.log(`[seed] admin password reset for ${email}`);
  } else {
    db.prepare("INSERT INTO admin_users (email, password_hash) VALUES (?, ?)").run(email, hash);
    console.log(`[seed] admin created: ${email}`);
  }
  console.log("[seed] WARNING: unset ADMIN_PASSWORD in your environment now.");
} else {
  console.log("[seed] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin bootstrap.");
}

const count = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as any).n;
if (count > 0) {
  console.log(`[seed] products table has ${count} rows — skipping sample products.`);
} else {
  const insP = db.prepare(
    "INSERT INTO products (name, slug, description, featured, display_order) VALUES (?, ?, ?, ?, ?)"
  );
  const insV = db.prepare(
    "INSERT INTO product_variants (product_id, label, weight_grams, price_cents, display_order) VALUES (?, ?, ?, ?, ?)"
  );
  for (const p of SAMPLE_PRODUCTS) {
    const info = insP.run(p.name, p.slug, p.description, p.featured, p.display_order);
    const pid = Number(info.lastInsertRowid);
    p.variants.forEach((v, i) => insV.run(pid, v.label, v.weight_grams, v.price_cents, i));
  }
  console.log(`[seed] inserted ${SAMPLE_PRODUCTS.length} SAMPLE products (clearly labelled).`);
}

console.log("[seed] done.");
