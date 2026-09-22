"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, isLockedOut, recordAttempt, verifyCredentials } from "@/lib/auth";
import { config } from "@/lib/config";

/**
 * Login server action. Generic errors only — no user enumeration.
 * Rate limiting: 5 failed attempts per IP per 15 minutes (see src/lib/auth.ts).
 */
export async function loginAction(
  _prev: { error: string | null } | undefined,
  formData: FormData
): Promise<{ error: string | null }> {
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isLockedOut(ip)) {
    return { error: "Too many attempts. Try again later." };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const admin = verifyCredentials(email, password);
  if (!admin) {
    recordAttempt(ip, false);
    return { error: "Invalid email or password." };
  }

  recordAttempt(ip, true);
  const { token, expiresAt } = createSession(admin.id);

  cookies().set("bb_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });

  redirect("/admin");
}
