import Link from "next/link";
import { config } from "@/lib/config";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand brand-with-logo">
          <img
            src="/assets/bushman-logo.jpg"
            alt="Bushman Biltong logo"
            className="brand-logo"
            width={40}
            height={40}
          />
          Bushman <span>Biltong</span>
        </Link>
        <nav aria-label="Main">
          <Link href="/" className="nav-link">
            Home
          </Link>
          <Link href="/contact" className="nav-link">
            Contact
          </Link>
          <Link href="/order" className="btn btn-primary nav-cta">
            Order Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
