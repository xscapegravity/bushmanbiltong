import { describe, it, expect } from "vitest";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  readImageField,
  validateProductImage,
} from "@/lib/product-image";

const JPEG_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/";

describe("validateProductImage", () => {
  it("accepts a valid JPEG data URL", () => {
    const r = validateProductImage(JPEG_DATA_URL);
    expect(r.ok).toBe(true);
  });

  it("accepts PNG and WebP data URLs", () => {
    expect(validateProductImage("data:image/png;base64,iVBORw0KGgo=").ok).toBe(true);
    expect(validateProductImage("data:image/webp;base64,UklGRhIA=").ok).toBe(true);
  });

  it("accepts an empty string (no image)", () => {
    const r = validateProductImage("");
    expect(r.ok).toBe(true);
    expect(r).toEqual({ ok: true, value: "" });
  });

  it("rejects a non-data-URL value", () => {
    const r = validateProductImage("https://example.com/pic.jpg");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Image must be JPEG, PNG or WebP up to 3 MB.");
  });

  it("rejects a data URL with a disallowed mime type", () => {
    expect(validateProductImage("data:image/gif;base64,R0lGODlh").ok).toBe(false);
    expect(validateProductImage("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok).toBe(false);
  });

  it("rejects a data URL whose payload exceeds 3 MB decoded", () => {
    // base64 length * 3/4 must stay under PRODUCT_IMAGE_MAX_BYTES.
    const tooBigBase64 = "A".repeat(Math.ceil((PRODUCT_IMAGE_MAX_BYTES * 4) / 3) + 8);
    const r = validateProductImage(`data:image/jpeg;base64,${tooBigBase64}`);
    expect(r.ok).toBe(false);
  });

  it("accepts a data URL just under the 3 MB limit", () => {
    const okBase64 = "A".repeat(Math.ceil((PRODUCT_IMAGE_MAX_BYTES * 4) / 3) - 8);
    const r = validateProductImage(`data:image/jpeg;base64,${okBase64}`);
    expect(r.ok).toBe(true);
  });
});

describe("readImageField", () => {
  it("returns null when the image field is absent (keep existing image)", () => {
    const fd = new FormData();
    fd.set("name", "Original");
    expect(readImageField(fd)).toBeNull();
  });

  it("returns the submitted value when the field is present, including empty string", () => {
    const fd = new FormData();
    fd.set("image", "");
    expect(readImageField(fd)).toBe("");

    fd.set("image", JPEG_DATA_URL);
    expect(readImageField(fd)).toBe(JPEG_DATA_URL);
  });
});
