import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { config } from "@/lib/config";
import OrderForm, {
  type ProductOption,
} from "@/components/order/OrderForm";

export const metadata: Metadata = {
  title: "Order Online",
  description:
    "Order premium handcrafted biltong for pickup or local delivery. No payment required online — we confirm every order personally.",
};

export const dynamic = "force-dynamic";

interface VariantRow {
  id: number;
  label: string;
  price_cents: number;
  weight_grams: number | null;
}

interface ProductRow {
  id: number;
  name: string;
  description: string;
}

function loadActiveProducts(): ProductOption[] {
  const db = getDb();
  const products = db
    .prepare(
      `SELECT id, name, description FROM products
       WHERE active = 1
       ORDER BY display_order, name`
    )
    .all() as ProductRow[];

  const variantStmt = db.prepare(
    `SELECT id, label, price_cents, weight_grams FROM product_variants
     WHERE product_id = ? AND active = 1
     ORDER BY display_order, id`
  );

  const out: ProductOption[] = [];
  for (const p of products) {
    const variants = variantStmt.all(p.id) as VariantRow[];
    if (variants.length === 0) continue;
    out.push({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      variants: variants.map((v) => ({
        id: v.id,
        label: v.label,
        priceCents: v.price_cents,
        weightGrams: v.weight_grams ?? null,
      })),
    });
  }
  return out;
}

export default function OrderPage() {
  const products = loadActiveProducts();

  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <p className="eyebrow">Order online</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginTop: 0 }}>
        Place your order
      </h1>
      <p className="muted" style={{ maxWidth: 640, marginTop: 0 }}>
        Choose your biltong, tell us how you&apos;d like it — pickup or local
        delivery — and we&apos;ll be in touch to confirm. No payment is taken
        online.
      </p>

      <OrderForm
        products={products}
        config={{
          pickup: {
            enabled: config.pickup.enabled,
            name: config.pickup.name,
            address: config.pickup.address,
            instructions: config.pickup.instructions,
          },
          delivery: {
            enabled: config.delivery.enabled,
            feeCents: config.delivery.feeCents,
            freeThresholdCents: config.delivery.freeThresholdCents,
            instructions: config.delivery.instructions,
          },
        }}
      />
    </div>
  );
}
