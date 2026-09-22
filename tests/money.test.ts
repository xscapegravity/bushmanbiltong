import { describe, it, expect } from "vitest";
import { computeTotals, formatAUD, dollarsToCents } from "@/lib/money";

describe("computeTotals", () => {
  it("computes subtotal for a single item", () => {
    const t = computeTotals([{ unitPriceCents: 1000, quantity: 2 }], 0);
    expect(t.subtotalCents).toBe(2000);
    expect(t.totalCents).toBe(2000);
  });

  it("computes subtotal across multiple items", () => {
    const t = computeTotals(
      [
        { unitPriceCents: 1000, quantity: 2 },
        { unitPriceCents: 2250, quantity: 1 },
      ],
      0
    );
    expect(t.subtotalCents).toBe(4250);
  });

  it("adds delivery fee", () => {
    const t = computeTotals([{ unitPriceCents: 1000, quantity: 1 }], 700);
    expect(t.totalCents).toBe(1700);
    expect(t.deliveryFeeCents).toBe(700);
  });

  it("handles zero delivery fee", () => {
    const t = computeTotals([{ unitPriceCents: 500, quantity: 3 }], 0);
    expect(t.totalCents).toBe(1500);
  });

  it("is exact with money (no float drift)", () => {
    const t = computeTotals(
      [
        { unitPriceCents: 1050, quantity: 3 },
        { unitPriceCents: 1999, quantity: 2 },
      ],
      700
    );
    expect(t.subtotalCents).toBe(7148);
    expect(t.totalCents).toBe(7848);
  });
});

describe("formatAUD", () => {
  it("formats cents as AUD", () => {
    expect(formatAUD(2250)).toMatch(/\$22\.50/);
  });
  it("formats zero", () => {
    expect(formatAUD(0)).toMatch(/\$0\.00/);
  });
});

describe("dollarsToCents", () => {
  it("converts and rounds safely", () => {
    expect(dollarsToCents(22.5)).toBe(2250);
    expect(dollarsToCents(0.1 + 0.2)).toBe(30); // float guard
  });
});
