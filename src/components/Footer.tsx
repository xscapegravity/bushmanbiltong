import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="brand-footer">Bushman Biltong</p>
          <p className="small muted">
            Premium artisan biltong, handcrafted in small batches.
          </p>
        </div>
        <nav aria-label="Footer" className="footer-nav">
          <Link href="/privacy">Privacy</Link>
          <Link href="/admin/login" className="footer-admin-link">
            Admin
          </Link>
        </nav>
        <p className="small muted">
          {config.site.instagramHandle} ·{" "}
          <a href={config.site.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </p>
      </div>
    </footer>
  );
}
