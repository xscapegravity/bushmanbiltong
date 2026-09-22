"use client";

import { useMemo, useState } from "react";
import { formatAUD } from "@/lib/money";
import { submitOrder, type SubmitFailure } from "@/app/(public)/order/actions";

export interface VariantOption {
  id: number;
  label: string;
  priceCents: number;
  weightGrams: number | null;
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  variants: VariantOption[];
}

export interface OrderFormConfig {
  pickup: { enabled: boolean; name: string; address: string; instructions: string };
  delivery: {
    enabled: boolean;
    feeCents: number;
    freeThresholdCents: number;
    instructions: string;
  };
}

interface Props {
  products: ProductOption[];
  config: OrderFormConfig;
}

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

const NOTICE_TEXT =
  "No payment is required online at this stage. We will confirm your order and payment arrangements after your order is received.";

type Selections = Record<number, { variantId: number; quantity: number }>;

type FieldKey =
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "addressLine1"
  | "addressLine2"
  | "suburb"
  | "state"
  | "postcode"
  | "customerNotes";

const EMPTY_FIELDS: Record<FieldKey, string> = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  suburb: "",
  state: "",
  postcode: "",
  customerNotes: "",
};

export default function OrderForm({ products, config }: Props) {
  const pickupOnly = !config.delivery.enabled;
  const deliveryOnly = !config.pickup.enabled;

  const initialSelections: Selections = useMemo(() => {
    const s: Selections = {};
    for (const p of products) {
      if (p.variants.length > 0) {
        s[p.id] = { variantId: p.variants[0].id, quantity: 0 };
      }
    }
    return s;
  }, [products]);

  const [selections, setSelections] = useState<Selections>(initialSelections);
  const [method, setMethod] = useState<"PICKUP" | "DELIVERY">(
    pickupOnly ? "PICKUP" : deliveryOnly ? "DELIVERY" : "PICKUP"
  );
  const [fields, setFields] = useState<Record<FieldKey, string>>({ ...EMPTY_FIELDS });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SubmitFailure>(undefined);

  const deliveryFeeCents = config.delivery.feeCents;
  const freeThreshold = config.delivery.freeThresholdCents;

  const lines = useMemo(() => {
    const out: {
      variantId: number;
      name: string;
      variantLabel: string;
      unit: number;
      qty: number;
      total: number;
    }[] = [];
    for (const p of products) {
      const sel = selections[p.id];
      if (!sel || sel.quantity < 1) continue;
      const v = p.variants.find((x) => x.id === sel.variantId);
      if (!v) continue;
      out.push({
        variantId: v.id,
        name: p.name,
        variantLabel: v.label,
        unit: v.priceCents,
        qty: sel.quantity,
        total: v.priceCents * sel.quantity,
      });
    }
    return out;
  }, [products, selections]);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const isDelivery = method === "DELIVERY";
  const feeWaived = isDelivery && freeThreshold > 0 && subtotal >= freeThreshold;
  const fee = isDelivery && subtotal > 0 ? (feeWaived ? 0 : deliveryFeeCents) : 0;
  const total = subtotal + fee;

  const setQty = (productId: number, qty: number) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: Math.max(0, Math.min(99, qty)) },
    }));
  };

  const setVariant = (productId: number, variantId: number) => {
    setSelections((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], variantId },
    }));
  };

  const setField = (key: FieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  function validate(): Partial<Record<FieldKey, string>> {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (!fields.firstName.trim()) errs.firstName = "First name is required.";
    if (!fields.lastName.trim()) errs.lastName = "Last name is required.";
    if (!/^[0-9+\-\s()]{6,20}$/.test(fields.phone.trim()))
      errs.phone = "A valid mobile number is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email.trim()))
      errs.email = "A valid email address is required.";
    if (isDelivery) {
      if (!fields.addressLine1.trim()) errs.addressLine1 = "Street address is required for delivery.";
      if (!fields.suburb.trim()) errs.suburb = "Suburb is required for delivery.";
      if (!fields.state.trim()) errs.state = "State is required for delivery.";
      if (!/^\d{4}$/.test(fields.postcode.trim()))
        errs.postcode = "Enter a valid 4-digit Australian postcode.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFailure(undefined);

    if (lines.length === 0) {
      setFailure({
        ok: false,
        error: "validation",
        message: "Your order is empty — choose a quantity for at least one product.",
      });
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFailure({
        ok: false,
        error: "validation",
        message: "Please fix the highlighted fields below.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitOrder({
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
        fulfilmentMethod: method,
        firstName: fields.firstName,
        lastName: fields.lastName,
        phone: fields.phone,
        email: fields.email,
        addressLine1: isDelivery ? fields.addressLine1 : "",
        addressLine2: isDelivery ? fields.addressLine2 : "",
        suburb: isDelivery ? fields.suburb : "",
        state: isDelivery ? fields.state : "",
        postcode: isDelivery ? fields.postcode : "",
        customerNotes: fields.customerNotes,
      });
      if (result && result.ok === false) {
        setFailure(result);
        setSubmitting(false);
      }
      // On success the server action redirects (POST-redirect-GET); nothing to do here.
    } catch {
      setFailure({
        ok: false,
        error: "internal",
        message: "Something went wrong while placing your order. Please try again.",
      });
      setSubmitting(false);
    }
  }

  const inputId = (k: FieldKey) => `of-${k}`;

  function renderInput(key: FieldKey, label: string, type: string, opts: {
    autoComplete?: string;
    required?: boolean;
    placeholder?: string;
  } = {}) {
    const err = fieldErrors[key];
    return (
      <div>
        <label htmlFor={inputId(key)}>
          {label}
          {opts.required ? (
            <span aria-hidden="true"> *</span>
          ) : (
            <span className="muted small"> (optional)</span>
          )}
        </label>
        <input
          id={inputId(key)}
          name={key}
          type={type}
          value={fields[key]}
          onChange={(e) => setField(key, e.target.value)}
          autoComplete={opts.autoComplete}
          placeholder={opts.placeholder}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${inputId(key)}-error` : undefined}
        />
        {err && (
          <p className="error-text" id={`${inputId(key)}-error`}>
            {err}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ---- Products ---- */}
      <section aria-labelledby="order-products-heading" style={{ marginBottom: 40 }}>
        <h2 id="order-products-heading" style={{ fontSize: "1.5rem", marginBottom: 16 }}>
          Choose your biltong
        </h2>
        {products.length === 0 ? (
          <p className="notice">
            Our online range is being restocked right now. Please check back soon.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {products.map((p) => {
              const sel = selections[p.id];
              const qty = sel?.quantity ?? 0;
              const variant =
                p.variants.find((v) => v.id === sel?.variantId) ?? p.variants[0];
              return (
                <article
                  key={p.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    padding: "18px 18px 14px",
                    background: "#fff",
                  }}
                >
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.15rem" }}>{p.name}</h3>
                  {p.description && (
                    <p className="muted small" style={{ margin: "0 0 14px" }}>
                      {p.description}
                    </p>
                  )}

                  {p.variants.length === 1 ? (
                    <p className="small" style={{ margin: "0 0 12px" }}>
                      {variant?.label} — {formatAUD(variant?.priceCents ?? 0)}
                    </p>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <label htmlFor={`variant-${p.id}`} className="small">
                        Size
                      </label>
                      <select
                        id={`variant-${p.id}`}
                        value={sel?.variantId ?? p.variants[0]?.id}
                        onChange={(e) => setVariant(p.id, Number(e.target.value))}
                      >
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label} — {formatAUD(v.priceCents)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <fieldset
                    style={{
                      border: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <legend
                      className="small"
                      style={{ padding: 0, marginBottom: 6, fontWeight: 700 }}
                    >
                      Quantity
                    </legend>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty - 1)}
                        aria-label={`Decrease quantity of ${p.name}`}
                        className="btn"
                        style={{
                          padding: "6px 14px",
                          minWidth: 44,
                          background: "var(--cream-2)",
                          color: "var(--ink)",
                          borderColor: "var(--line)",
                        }}
                        disabled={qty <= 0}
                      >
                        −
                      </button>
                      <output
                        aria-live="polite"
                        aria-label={`Quantity of ${p.name}: ${qty}`}
                        style={{ minWidth: 36, textAlign: "center", fontWeight: 700 }}
                      >
                        {qty}
                      </output>
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty + 1)}
                        aria-label={`Increase quantity of ${p.name}`}
                        className="btn"
                        style={{
                          padding: "6px 14px",
                          minWidth: 44,
                          background: "var(--cream-2)",
                          color: "var(--ink)",
                          borderColor: "var(--line)",
                        }}
                        disabled={qty >= 99}
                      >
                        +
                      </button>
                    </div>
                  </fieldset>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Fulfilment ---- */}
      <section aria-labelledby="order-fulfilment-heading" style={{ marginBottom: 40 }}>
        <h2 id="order-fulfilment-heading" style={{ fontSize: "1.5rem", marginBottom: 16 }}>
          Pickup or delivery
        </h2>
        <div
          role="radiogroup"
          aria-label="Fulfilment method"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}
        >
          {!deliveryOnly && (
            <button
              type="button"
              role="radio"
              aria-checked={method === "PICKUP"}
              onClick={() => setMethod("PICKUP")}
              className="btn"
              style={
                method === "PICKUP"
                  ? { background: "var(--terra)", color: "#fff" }
                  : { background: "#fff", color: "var(--ink)", border: "1px solid var(--line)" }
              }
            >
              Pickup
            </button>
          )}
          {!pickupOnly && (
            <button
              type="button"
              role="radio"
              aria-checked={method === "DELIVERY"}
              onClick={() => setMethod("DELIVERY")}
              className="btn"
              style={
                method === "DELIVERY"
                  ? { background: "var(--terra)", color: "#fff" }
                  : { background: "#fff", color: "var(--ink)", border: "1px solid var(--line)" }
              }
            >
              Local Delivery
            </button>
          )}
        </div>

        {method === "PICKUP" && config.pickup.name && (
          <div className="notice">
            <strong>{config.pickup.name}</strong>
            {config.pickup.address && (
              <>
                <br />
                {config.pickup.address}
              </>
            )}
            {config.pickup.instructions && (
              <>
                <br />
                <span className="small muted">{config.pickup.instructions}</span>
              </>
            )}
          </div>
        )}
        {method === "DELIVERY" && config.delivery.instructions && (
          <div className="notice">
            <span className="small">{config.delivery.instructions}</span>
          </div>
        )}
      </section>

      {/* ---- Your details ---- */}
      <section aria-labelledby="order-details-heading" style={{ marginBottom: 40 }}>
        <h2 id="order-details-heading" style={{ fontSize: "1.5rem", marginBottom: 16 }}>
          Your details
        </h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {renderInput("firstName", "First name", "text", {
            autoComplete: "given-name",
            required: true,
          })}
          {renderInput("lastName", "Last name", "text", {
            autoComplete: "family-name",
            required: true,
          })}
        </div>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {renderInput("phone", "Mobile", "tel", {
            autoComplete: "tel",
            required: true,
            placeholder: "04xx xxx xxx",
          })}
          {renderInput("email", "Email", "email", {
            autoComplete: "email",
            required: true,
          })}
          <div>
            <label htmlFor={inputId("customerNotes")}>
              Notes <span className="muted small">(optional)</span>
            </label>
            <textarea
              id={inputId("customerNotes")}
              name="customerNotes"
              rows={3}
              value={fields.customerNotes}
              onChange={(e) => setField("customerNotes", e.target.value)}
              placeholder="Anything we should know? Allergies, delivery timing…"
            />
          </div>
        </div>
      </section>

      {/* ---- Delivery address ---- */}
      {isDelivery && (
        <section aria-labelledby="order-address-heading" style={{ marginBottom: 40 }}>
          <h2 id="order-address-heading" style={{ fontSize: "1.5rem", marginBottom: 16 }}>
            Delivery address
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            {renderInput("addressLine1", "Address line 1", "text", {
              autoComplete: "address-line1",
              required: true,
            })}
            {renderInput("addressLine2", "Address line 2", "text", {
              autoComplete: "address-line2",
            })}
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {renderInput("suburb", "Suburb", "text", {
                autoComplete: "address-level2",
                required: true,
              })}
              <div>
                <label htmlFor={inputId("state")}>
                  State <span aria-hidden="true">*</span>
                </label>
                <select
                  id={inputId("state")}
                  name="state"
                  value={fields.state}
                  onChange={(e) => setField("state", e.target.value)}
                  autoComplete="address-level1"
                  aria-invalid={fieldErrors.state ? true : undefined}
                  aria-describedby={fieldErrors.state ? `${inputId("state")}-error` : undefined}
                >
                  <option value="">Select…</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {fieldErrors.state && (
                  <p className="error-text" id={`${inputId("state")}-error`}>
                    {fieldErrors.state}
                  </p>
                )}
              </div>
            </div>
            {renderInput("postcode", "Postcode", "text", {
              autoComplete: "postal-code",
              required: true,
              placeholder: "e.g. 2600",
            })}
          </div>
        </section>
      )}

      {/* ---- Live summary (never hidden on mobile) ---- */}
      <section
        aria-labelledby="order-summary-heading"
        style={{
          border: "2px solid var(--terra)",
          borderRadius: "var(--radius)",
          background: "#fff",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 id="order-summary-heading" style={{ fontSize: "1.3rem", margin: "0 0 12px" }}>
          Order summary
        </h2>
        {lines.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Your order is empty — add something above.
          </p>
        ) : (
          <>
            <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
              {lines.map((l) => (
                <li
                  key={l.variantId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                  className="small"
                >
                  <span>
                    {l.qty} × {l.name} ({l.variantLabel})
                  </span>
                  <span>{formatAUD(l.total)}</span>
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", justifyContent: "space-between" }} className="small">
              <span>Subtotal</span>
              <span>{formatAUD(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }} className="small">
              <span>{isDelivery ? "Delivery fee" : "Pickup"}</span>
              <span>
                {isDelivery ? (feeWaived ? "FREE" : formatAUD(deliveryFeeCents)) : "—"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTop: "2px solid var(--line)",
                fontWeight: 700,
                fontSize: "1.15rem",
              }}
            >
              <span>Total</span>
              <span aria-live="polite" aria-atomic="true">
                {formatAUD(total)}
              </span>
            </div>
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              Calculated again on our server before your order is placed.
            </p>
          </>
        )}
      </section>

      {failure && (
        <div role="alert" className="error-text" style={{ marginBottom: 16 }}>
          {failure.message}
        </div>
      )}

      <div className="notice" style={{ marginBottom: 20 }}>
        {NOTICE_TEXT}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        style={{ width: "100%", maxWidth: 420 }}
      >
        {submitting ? "Placing your order…" : "Place order"}
      </button>
    </form>
  );
}
