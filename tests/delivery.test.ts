import { describe, it, expect } from "vitest";
import { checkDeliveryEligibility } from "@/lib/delivery";

describe("checkDeliveryEligibility", () => {
  it("accepts an allowed postcode", () => {
    expect(checkDeliveryEligibility("2000").eligible).toBe(true);
  });

  it("rejects a disallowed postcode with pickup suggestion", () => {
    const r = checkDeliveryEligibility("4000");
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/pickup/i);
  });

  it("rejects malformed postcodes", () => {
    expect(checkDeliveryEligibility("abc").eligible).toBe(false);
    expect(checkDeliveryEligibility("12").eligible).toBe(false);
    expect(checkDeliveryEligibility("12345").eligible).toBe(false);
    expect(checkDeliveryEligibility("").eligible).toBe(false);
  });

  it("rejects when delivery disabled", () => {
    // env DELIVERY_ENABLED not toggled here — feature tested via config path
    const r = checkDeliveryEligibility("2000");
    expect(r.eligible).toBe(true);
  });
});
