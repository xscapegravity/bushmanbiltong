"use server";

import { redirect } from "next/navigation";
import { createOrder, type OrderInput } from "@/lib/orders";

export type SubmitFailure =
  | {
      ok: false;
      error: "validation" | "delivery" | "unavailable" | "internal";
      message: string;
    }
  | undefined;

/**
 * Wraps createOrder (the server-side source of truth).
 * Never trusts client prices or eligibility — createOrder recalculates
 * everything and re-checks delivery/postcode/availability.
 * On success: POST-redirect-GET to /order/confirmation?n=<orderNumber>
 * so the confirmation page is safe to refresh.
 */
export async function submitOrder(input: OrderInput): Promise<SubmitFailure> {
  const rawItems = Array.isArray(input?.items) ? input.items : [];
  const items = rawItems
    .map((it) => ({
      variantId: Number(it?.variantId),
      quantity: Number(it?.quantity),
    }))
    .filter(
      (it) =>
        Number.isInteger(it.variantId) &&
        it.variantId > 0 &&
        Number.isInteger(it.quantity) &&
        it.quantity >= 1 &&
        it.quantity <= 99
    );

  const result = createOrder({
    items,
    fulfilmentMethod: input?.fulfilmentMethod === "DELIVERY" ? "DELIVERY" : "PICKUP",
    firstName: String(input?.firstName ?? "").trim(),
    lastName: String(input?.lastName ?? "").trim(),
    phone: String(input?.phone ?? "").trim(),
    email: String(input?.email ?? "").trim(),
    addressLine1: String(input?.addressLine1 ?? "").trim(),
    addressLine2: String(input?.addressLine2 ?? "").trim(),
    suburb: String(input?.suburb ?? "").trim(),
    state: String(input?.state ?? "").trim(),
    postcode: String(input?.postcode ?? "").trim(),
    customerNotes: String(input?.customerNotes ?? "").trim(),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error === "internal" ? "internal" : result.error,
      message: result.message,
    };
  }

  redirect(`/order/confirmation?n=${encodeURIComponent(result.orderNumber)}`);
}
