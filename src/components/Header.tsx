import Link from "next/link";
import { config } from "@/lib/config";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          Bushman <span>Biltong</span>
        </Link>
        <nav aria-label="Main">
          <Link href="/order" className="btn btn-primary nav-cta">
            Order Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
