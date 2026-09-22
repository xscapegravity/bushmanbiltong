import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Sign in",
};

export default function AdminLoginPage() {
  // Already signed in? Straight to the dashboard.
  const token = cookies().get("bb_admin")?.value;
  if (getSessionAdmin(token)) redirect("/admin");

  // Touch headers() so the page is dynamic and the action's rate limit
  // sees the same request context.
  headers();

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <h1>Admin sign in</h1>
        <p className="muted small">
          Restricted area — Bushman Biltong staff only.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
