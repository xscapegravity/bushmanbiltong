import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { config } from "@/lib/config";
import { formatAUD } from "@/lib/money";

export const metadata: Metadata = {
  title: "Biltong — Handcrafted Small-Batch Biltong",
  description:
    "Bushman Biltong: handcrafted biltong made in small batches with whole spices. Order online for pickup or local delivery. No payment online — we confirm every order personally.",
};

// Product preview reads the live DB so admin changes show without a rebuild.
export const dynamic = "force-dynamic";

type ProductRow = {
  id: number;
  name: string;
  description: string;
  image: string;
  active: number;
  min_price_cents: number | null;
};

/** Active products with their cheapest active variant price, in display order. */
function getActiveProducts(): ProductRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.id, p.name, p.description, p.image, p.active,
              MIN(v.price_cents) AS min_price_cents
         FROM products p
         LEFT JOIN product_variants v
           ON v.product_id = p.id AND v.active = 1
        WHERE p.active = 1
        GROUP BY p.id
        ORDER BY p.display_order, p.id`
    )
    .all() as ProductRow[];
}

const GALLERY = [
  {
    src: "/assets/IMG20260819204805.jpg",
    alt: "Sliced biltong with a dark spiced crust and deep red centre, piled on a wooden cutting board.",
  },
  {
    src: "/assets/IMG20260902201415.jpg",
    alt: "Vacuum-sealed packs of biltong with branded labels, resting in a wooden drying box.",
  },
  {
    src: "/assets/IMG20260828201001.jpg",
    alt: "A whole beef cut beside ramekins of whole coriander, cracked pepper, salt and sugar, ready for curing.",
  },
  {
    src: "/assets/IMG20260903205259.jpg",
    alt: "Biltong strips curing on wire racks inside a wooden drying cabinet.",
  },
];

export default function HomePage() {
  const products = getActiveProducts();

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Small-batch · Hand-sliced</p>
          <h1>Biltong, the slow way.</h1>
          <p>
            Bushman Biltong is cured with whole spices and air-dried in small
            batches. Order online, then collect or get it delivered locally —
            no payment online, we confirm every order personally.
          </p>
          <div className="hero-actions">
            <Link href="/order" className="btn btn-primary">
              Order Now
            </Link>
            <Link href="/order#products" className="btn btn-secondary">
              Our Biltong
            </Link>
          </div>
          <div className="hero-image">
            <Image
              src="/assets/IMG20260819204805.jpg"
              alt="Sliced biltong with a dark spiced crust and deep red centre on a wooden cutting board."
              width={1800}
              height={2400}
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1100px"
            />
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="section" id="products">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Our Biltong</p>
            <h2>What&apos;s in the batch</h2>
            <p className="muted">
              {products.length > 0
                ? "Current lineup — choose your biltong and how much you'd like."
                : "Our range is being finalised. Check back soon."}
            </p>
          </div>

          {products.length > 0 && (
            <div className="product-grid">
              {products.map((p) => (
                <article key={p.id} className="product-card">
                  <div className="product-card-media">
                    {p.image ? (
                      p.image.startsWith("data:") ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- next/image can't optimize data URLs */
                        <img
                          className="product-card-img-data"
                          src={p.image}
                          alt={p.name}
                        />
                      ) : (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                        />
                      )
                    ) : (
                      <div className="product-card-placeholder">Bushman Biltong</div>
                    )}
                    {/* TODO-OWNER: product photos not yet in DB; placeholder block shows until images are set in admin */}
                  </div>
                  <div className="product-card-body">
                    <h3>{p.name}</h3>
                    <p className="muted">{p.description}</p>
                    <div className="product-card-meta">
                      <span className="price-from">
                        {p.min_price_cents != null
                          ? `from ${formatAUD(p.min_price_cents)}`
                          : "Price coming soon"}
                      </span>
                      <span
                        className={`availability ${
                          p.min_price_cents != null
                            ? "availability-in"
                            : "availability-tbc"
                        }`}
                      >
                        {p.min_price_cents != null
                          ? "Available"
                          : "Sizes to be confirmed"}
                      </span>
                      <Link href="/order" className="btn btn-dark small">
                        Order
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="container" style={{ marginTop: 40 }}>
          <p className="muted small">
            Full range, sizes and quantities are on the{" "}
            <Link href="/order">order page</Link>.
          </p>
        </div>
      </section>

      {/* Why Bushman Biltong */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Why Bushman Biltong</p>
            <h2>What goes into every batch</h2>
          </div>
          <div className="why-grid">
            <div className="why-block">
              <span className="placeholder-note">(placeholder)</span>
              {/* TODO-OWNER: replace selling-point copy with approved brand claims */}
              <h3>Whole spices, no shortcuts</h3>
              <p>
                (placeholder) Copy about whole coriander, cracked pepper and
                salt going into every batch.
              </p>
            </div>
            <div className="why-block">
              <span className="placeholder-note">(placeholder)</span>
              {/* TODO-OWNER: replace selling-point copy with approved brand claims */}
              <h3>Air-dried, small batches</h3>
              <p>
                (placeholder) Copy about traditional air-drying and batch
                sizes.
              </p>
            </div>
            <div className="why-block">
              <span className="placeholder-note">(placeholder)</span>
              {/* TODO-OWNER: replace selling-point copy with approved brand claims */}
              <h3>Australian beef</h3>
              <p>
                (placeholder) Copy about beef sourcing and quality. No health
                or &quot;best in Australia&quot; claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section">
        <div className="container story-grid">
          <div>
            <p className="eyebrow">Our Story</p>
            <span className="placeholder-note">(placeholder)</span>
            {/* TODO-OWNER: replace with the owner's real story */}
            <h2>From our kitchen to yours</h2>
            <p>
              (placeholder) Story copy goes here — who we are, why we started
              making biltong, and what keeps the batches small.
            </p>
          </div>
          <div>
            <Image
              src="/assets/IMG20260818205557.jpg"
              alt="Beef strips coated in whole coriander seeds and cracked pepper, marinating before curing."
              width={1800}
              height={1350}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Photography */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">From the bench</p>
            <h2>Behind the batches</h2>
            <p className="muted">
              Follow along on Instagram{" "}
              <a
                href={config.site.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                {config.site.instagramHandle}
              </a>{" "}
              for new batches and what&apos;s curing now.
            </p>
          </div>
          <div className="gallery">
            {GALLERY.map((g) => (
              <figure key={g.src}>
                <Image
                  src={g.src}
                  alt={g.alt}
                  width={1200}
                  height={1200}
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Fulfilment */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Pickup &amp; Delivery</p>
            <h2>How you get your biltong</h2>
          </div>
          <div className="fulfil-grid">
            {config.pickup.enabled && (
              <div className="fulfil-card">
                <h3>Pickup</h3>
                <p className="muted">
                  {config.pickup.name || "Pickup location to be confirmed"}
                </p>
                {config.pickup.address ? (
                  <p>{config.pickup.address}</p>
                ) : (
                  <p className="muted small">Address to be confirmed.</p>
                )}
                {config.pickup.instructions && (
                  <p className="small muted">{config.pickup.instructions}</p>
                )}
              </div>
            )}
            {config.delivery.enabled && (
              <div className="fulfil-card">
                <h3>Local Delivery</h3>
                <p className="muted">
                  {config.delivery.suburbs.length > 0
                    ? `Delivering to: ${config.delivery.suburbs.join(", ")}`
                    : "Delivery area to be confirmed."}
                </p>
                {config.delivery.feeCents > 0 && (
                  <p>
                    Delivery fee {formatAUD(config.delivery.feeCents)}
                    {config.delivery.freeThresholdCents > 0 && (
                      <> — free over {formatAUD(config.delivery.freeThresholdCents)}</>
                    )}
                  </p>
                )}
                {config.delivery.minOrderCents > 0 && (
                  <p className="small muted">
                    Minimum order {formatAUD(config.delivery.minOrderCents)}.
                  </p>
                )}
                {config.delivery.instructions && (
                  <p className="small muted">{config.delivery.instructions}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta">
        <div className="container">
          <h2>Order Biltong</h2>
          <p>
            Place your order online — we&apos;ll confirm it personally and take
            payment at pickup or delivery.
          </p>
          <Link href="/order" className="btn btn-primary">
            Order Biltong
          </Link>
        </div>
      </section>
    </>
  );
}
