import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { destroySession } from "@/lib/auth";
import "./admin.css";

export const dynamic = "force-dynamic";

async function logoutAction() {
  "use server";
  const token = cookies().get("bb_admin")?.value;
  destroySession(token);
  cookies().delete("bb_admin");
  redirect("/admin/login");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <Link href="/admin" className="admin-title">
              Bushman Biltong Admin
            </Link>
            <span className="admin-tag">Operations</span>
          </div>
          <nav className="admin-nav" aria-label="Admin">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/products">Products</Link>
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-secondary admin-logout">
              Log out
              <span className="visually-hidden"> of the admin area</span>
            </button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
