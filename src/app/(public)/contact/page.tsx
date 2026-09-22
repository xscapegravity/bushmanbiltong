import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Bushman Biltong — email, phone or Instagram. Pickup location details are being finalised.",
};

export default function ContactPage() {
  const { contactEmail, contactPhone, instagram, instagramHandle } =
    config.site;

  return (
    <>
      <section className="section">
        <div className="container">
          <p className="eyebrow">Contact</p>
          <h1>Get in touch</h1>
          <p className="muted" style={{ maxWidth: 640 }}>
            Questions about an order, pickup or delivery? The fastest way to
            reach us is email or Instagram.
          </p>

          <ul className="contact-list" style={{ marginTop: 40 }}>
            <li>
              <h3>Email</h3>
              {contactEmail ? (
                <p>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </p>
              ) : (
                <p className="muted">Coming soon</p>
              )}
            </li>

            <li>
              <h3>Phone</h3>
              {contactPhone ? (
                <p>
                  <a href={`tel:${contactPhone.replace(/[^+\d]/g, "")}`}>
                    {contactPhone}
                    {/* TODO-OWNER: confirm the public phone number before launch */}
                  </a>
                </p>
              ) : (
                <p className="muted">Coming soon</p>
              )}
            </li>

            <li>
              <h3>Instagram</h3>
              <p>
                <a href={instagram} target="_blank" rel="noopener noreferrer">
                  {instagramHandle}
                </a>
              </p>
            </li>
          </ul>

          <div className="notice" style={{ marginTop: 40, maxWidth: 640 }}>
            <strong>Pickup location — details coming soon.</strong> We&apos;ll
            share the exact pickup point and hours once confirmed. Placing an
            order now?{" "}
            <Link href="/order">
              Head to the order page
            </Link>{" "}
            and we&apos;ll confirm arrangements with you personally.
          </div>
        </div>
        {/* TODO-OWNER: consider adding a contact form later — this page is intentionally form-free (mailto only) */}
      </section>
    </>
  );
}
