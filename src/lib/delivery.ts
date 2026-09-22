import { config } from "./config";

/**
 * Delivery eligibility — SERVER-SIDE source of truth (spec §11).
 * The browser's idea of eligibility is never trusted.
 */

export interface DeliveryCheck {
  eligible: boolean;
  reason?: string;
}

export function checkDeliveryEligibility(
  postcode: string,
  suburb?: string
): DeliveryCheck {
  const { delivery } = config;

  if (!delivery.enabled) {
    return { eligible: false, reason: "Local delivery is not currently available." };
  }

  const pc = postcode.trim();
  if (!/^\d{4}$/.test(pc)) {
    return { eligible: false, reason: "Enter a valid 4-digit Australian postcode." };
  }

  if (delivery.postcodes.length > 0 && !delivery.postcodes.includes(pc)) {
    return {
      eligible: false,
      reason:
        "Local delivery isn't currently available to this postcode. You can still choose pickup.",
    };
  }

  if (delivery.suburbs.length > 0 && suburb) {
    const s = suburb.trim().toLowerCase();
    const allowed = delivery.suburbs.map((x) => x.toLowerCase());
    if (!allowed.includes(s)) {
      return {
        eligible: false,
        reason:
          "Local delivery isn't currently available to this suburb. You can still choose pickup.",
      };
    }
  }

  return { eligible: true };
}
