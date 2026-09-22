/**
 * Central configuration, read from environment variables.
 * Business values (pickup, delivery area, fees) are configurable, never hard-coded.
 * Secrets are read at runtime — never committed.
 */

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Comma-separated env value -> string list, trimmed, empties dropped. */
function list(name: string): string[] {
  return str(name)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  site: {
    name: str("BUSINESS_NAME", "Bushman Biltong"),
    url: str("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
    instagram: "https://www.instagram.com/bushman_biltong",
    instagramHandle: "@bushman_biltong",
    contactEmail: str("BUSINESS_EMAIL"),
    contactPhone: str("BUSINESS_PHONE"),
  },
  db: {
    path: str("DATABASE_PATH", "./data/biltong.db"),
  },
  session: {
    secret: str("SESSION_SECRET"),
    ttlDays: int("SESSION_TTL_DAYS", 7),
  },
  business: {
    notificationEmail: str("BUSINESS_EMAIL"),
  },
  pickup: {
    enabled: bool("PICKUP_ENABLED", true),
    name: str("PICKUP_NAME"),
    address: str("PICKUP_ADDRESS"),
    instructions: str("PICKUP_INSTRUCTIONS"),
  },
  delivery: {
    enabled: bool("DELIVERY_ENABLED", true),
    postcodes: list("DELIVERY_POSTCODES"),
    suburbs: list("DELIVERY_SUBURBS"),
    feeCents: int("DELIVERY_FEE_CENTS", 0),
    freeThresholdCents: int("FREE_DELIVERY_THRESHOLD_CENTS", 0),
    minOrderCents: int("DELIVERY_MIN_ORDER_CENTS", 0),
    instructions: str("DELIVERY_INSTRUCTIONS"),
  },
  email: {
    provider: str("EMAIL_PROVIDER", "none"),
  },
};

export type Config = typeof config;
