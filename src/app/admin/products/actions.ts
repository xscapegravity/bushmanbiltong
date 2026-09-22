"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * Product CRUD as server actions. Slug is auto-derived from name.
 * Variants are edited inline; prices are entered in dollars and converted
 * to integer cents via dollarsToCents. All actions revalidate /admin/products.
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface VariantInput {
  id: number | null;
  label: string;
  weight_grams: number | null;
  price_cents: number;
  active: number;
  display_order: number;
}

function parseVariants(
  formData: FormData
): { ok: true; variants: VariantInput[] } | { ok: false; error: string } {
  const ids = formData.getAll("variantId").map(String);
  const labels = formData.getAll("variantLabel").map(String);
  const weights = formData.getAll("variantWeightGrams").map(String);
  const prices = formData.getAll("variantPrice").map(String);
  const actives = formData.getAll("variantActive").map(String);

  const variants: VariantInput[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.trim();
    if (!label) continue; // skip empty rows

    const priceDollars = Number.parseFloat(prices[i] ?? "");
    if (!Number.isFinite(priceDollars) || priceDollars < 0) {
      return { ok: false, error: `Variant "${label}" needs a valid price.` };
    }

    let weight: number | null = null;
    const weightRaw = (weights[i] ?? "").trim();
    if (weightRaw) {
      const w = Number.parseInt(weightRaw, 10);
      if (!Number.isInteger(w) || w <= 0) {
        return { ok: false, error: `Variant "${label}" needs a valid weight in grams.` };
      }
      weight = w;
    }

    const idRaw = Number.parseInt(ids[i] ?? "", 10);
    variants.push({
      id: Number.isInteger(idRaw) && idRaw > 0 ? idRaw : null,
      label,
      weight_grams: weight,
      price_cents: dollarsToCents(priceDollars),
      active: actives[i] === "on" || actives[i] === "1" ? 1 : 0,
      display_order: i,
    });
  }
  return { ok: true, variants };
}

export async function createProductAction(formData: FormData): Promise<void> {
  requireAdmin();
  const db = getDb();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") ? 1 : 0;
  const featured = formData.get("featured") ? 1 : 0;
  const displayOrderRaw = Number.parseInt(String(formData.get("displayOrder") ?? "0"), 10);
  const displayOrder = Number.isInteger(displayOrderRaw) ? displayOrderRaw : 0;

  if (!name) {
    redirect("/admin/products?error=Product+name+is+required");
  }

  const parsed = parseVariants(formData);
  if (!parsed.ok) {
    redirect(`/admin/products?error=${encodeURIComponent(parsed.error)}`);
  }

  const slug = slugify(name);
  const exists = db.prepare("SELECT id FROM products WHERE slug = ?").get(slug);
  if (exists) {
    redirect(`/admin/products?error=${encodeURIComponent(`Slug "${slug}" is already in use.`)}`);
  }

  const productId = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO products (name, slug, description, active, featured, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(name, slug, description, active, featured, displayOrder);
    const pid = Number(info.lastInsertRowid);
    const vstmt = db.prepare(
      `INSERT INTO product_variants (product_id, label, weight_grams, price_cents, active, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const v of parsed.variants) {
      vstmt.run(pid, v.label, v.weight_grams, v.price_cents, v.active, v.display_order);
    }
    return pid;
  })();

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products?edit=${productId}&saved=1`);
}

export async function updateProductAction(formData: FormData): Promise<void> {
  requireAdmin();
  const db = getDb();

  const productId = Number.parseInt(String(formData.get("productId") ?? ""), 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    redirect("/admin/products?error=Unknown+product");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") ? 1 : 0;
  const featured = formData.get("featured") ? 1 : 0;
  const displayOrderRaw = Number.parseInt(String(formData.get("displayOrder") ?? "0"), 10);
  const displayOrder = Number.isInteger(displayOrderRaw) ? displayOrderRaw : 0;

  if (!name) {
    redirect(`/admin/products?edit=${productId}&error=Product+name+is+required`);
  }

  const parsed = parseVariants(formData);
  if (!parsed.ok) {
    redirect(`/admin/products?edit=${productId}&error=${encodeURIComponent(parsed.error)}`);
  }

  const slug = slugify(name);
  const clash = db
    .prepare("SELECT id FROM products WHERE slug = ? AND id != ?")
    .get(slug, productId);
  if (clash) {
    redirect(
      `/admin/products?edit=${productId}&error=${encodeURIComponent(`Slug "${slug}" is already in use.`)}`
    );
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE products SET name = ?, slug = ?, description = ?, active = ?, featured = ?,
         display_order = ?, updated_at = ? WHERE id = ?`
    ).run(name, slug, description, active, featured, displayOrder, new Date().toISOString(), productId);

    // Replace-all variant strategy: delete rows not present in the submission,
    // then upsert each submitted row (existing id -> UPDATE, new -> INSERT).
    const submitted = parsed.variants;
    const keepIds = submitted.filter((v) => v.id !== null).map((v) => v.id as number);
    const existing = db
      .prepare("SELECT id FROM product_variants WHERE product_id = ?")
      .all(productId) as { id: number }[];
    const del = db.prepare("DELETE FROM product_variants WHERE id = ? AND product_id = ?");
    for (const row of existing) {
      if (!keepIds.includes(row.id)) del.run(row.id, productId);
    }

    const upd = db.prepare(
      `UPDATE product_variants SET label = ?, weight_grams = ?, price_cents = ?, active = ?, display_order = ?
       WHERE id = ? AND product_id = ?`
    );
    const ins = db.prepare(
      `INSERT INTO product_variants (product_id, label, weight_grams, price_cents, active, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const v of submitted) {
      if (v.id !== null) {
        upd.run(v.label, v.weight_grams, v.price_cents, v.active, v.display_order, v.id, productId);
      } else {
        ins.run(productId, v.label, v.weight_grams, v.price_cents, v.active, v.display_order);
      }
    }
  })();

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products?edit=${productId}&saved=1`);
}

export async function deactivateProductAction(formData: FormData): Promise<void> {
  requireAdmin();
  const db = getDb();

  const productId = Number.parseInt(String(formData.get("productId") ?? ""), 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    redirect("/admin/products?error=Unknown+product");
  }

  db.prepare("UPDATE products SET active = 0, updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    productId
  );

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products?saved=1");
}
