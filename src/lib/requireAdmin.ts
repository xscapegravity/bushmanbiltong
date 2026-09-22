import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAdmin, type AdminUser } from "./auth";

/**
 * Real per-page auth check for admin pages and server actions.
 * Middleware only checks cookie presence (it cannot run better-sqlite3);
 * this validates the session against the database and redirects to the
 * login page when there is no valid session.
 */
export function requireAdmin(): AdminUser {
  const token = cookies().get("bb_admin")?.value;
  const admin = getSessionAdmin(token);
  if (!admin) redirect("/admin/login");
  return admin;
}
