import crypto from "node:crypto";
import { getDb } from "./db";
import { config } from "./config";

/**
 * Admin authentication: scrypt password hashing, opaque session tokens
 * (only the SHA-256 hash is stored), login rate limiting.
 * No plaintext passwords ever stored or logged.
 */

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
    .toString("hex");
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, N, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const derived = crypto.scryptSync(
      password,
      salt,
      hash.length / 2,
      { N: +N, r: +r, p: +p }
    );
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

// ---- Login rate limiting ----

const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

export function isLockedOut(ip: string): boolean {
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at > ?"
    )
    .get(ip, since) as { n: number };
  return row.n >= MAX_FAILURES;
}

export function recordAttempt(ip: string, success: boolean): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO login_attempts (ip, success) VALUES (?, ?)"
  ).run(ip, success ? 1 : 0);
}

// ---- Sessions ----

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(adminId: number): { token: string; expiresAt: Date } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.session.ttlDays * 86_400_000);
  db.prepare(
    "INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)"
  ).run(hashToken(token), adminId, expiresAt.toISOString());
  return { token, expiresAt };
}

export interface AdminUser {
  id: number;
  email: string;
}

export function getSessionAdmin(token: string | undefined): AdminUser | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`
    )
    .get(hashToken(token), new Date().toISOString()) as AdminUser | undefined;
  return row ?? null;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  const db = getDb();
  db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hashToken(token));
}

export function verifyCredentials(email: string, password: string): AdminUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, password_hash FROM admin_users WHERE email = ? AND active = 1")
    .get(email.trim().toLowerCase()) as
    | { id: number; email: string; password_hash: string }
    | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, email: row.email };
}
