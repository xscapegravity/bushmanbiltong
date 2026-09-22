import type { Metadata } from "next";
import "./globals.css";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(config.site.url),
  title: {
    default: "Bushman Biltong — Premium Artisan Biltong",
    template: "%s · Bushman Biltong",
  },
  description:
    "Premium handcrafted biltong. Order online for pickup or local delivery. No payment required online — we confirm every order personally.",
  openGraph: {
    siteName: "Bushman Biltong",
    type: "website",
    locale: "en_AU",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
