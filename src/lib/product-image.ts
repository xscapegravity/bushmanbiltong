/**
 * Product image validation. Product images are stored in the database as
 * base64 data URLs (the deployed container's filesystem is read-only outside
 * /app/data), so this validates the data-URL form before persistence.
 */

export const PRODUCT_IMAGE_MAX_BYTES = 3_000_000; // 3 MB decoded

const ALLOWED_TYPES = new Set(["jpeg", "png", "webp"]);

const DATA_URL_PREFIX_RE = /^data:image\/(jpeg|png|webp);base64,/;

/**
 * Validate a submitted product image value.
 * - "" is valid (no image / explicit removal when the field is present).
 * - Otherwise it must be a base64 data URL for JPEG, PNG or WebP whose
 *   decoded size is <= 3 MB (base64 length * 3/4 approximates the payload).
 */
export function validateProductImage(
  value: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === "") return { ok: true, value: "" };

  if (!DATA_URL_PREFIX_RE.test(value)) {
    return { ok: false, error: "Image must be JPEG, PNG or WebP up to 3 MB." };
  }

  const base64 = value.slice(value.indexOf(",") + 1);
  const decodedBytes = Math.floor((base64.length * 3) / 4);
  if (decodedBytes > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Image must be JPEG, PNG or WebP up to 3 MB." };
  }

  return { ok: true, value };
}

/**
 * Read the image field for an update. Returns "" when the field is absent
 * (e.g. a submission that predates the image input) so the existing image is
 * preserved; an empty string that IS present means explicit removal.
 */
export function readImageField(formData: FormData): string | null {
  return formData.has("image") ? String(formData.get("image") ?? "") : null;
}
