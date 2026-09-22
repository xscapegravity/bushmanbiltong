import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Bushman Biltong collects, uses and protects your personal information — order details only, nothing sold or shared, no online card payments.",
};

export default function PrivacyPage() {
  const { contactEmail } = config.site;

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy</h1>

        <div className="prose" style={{ marginTop: 32 }}>
          {/* TODO: legal review — this page is a plain-language template, not legal advice */}
          <p className="notice">
            This template needs review before launch. Sections marked{" "}
            <strong>TODO: legal review</strong> must be checked by someone
            qualified.
          </p>

          <span className="placeholder-note">TODO: legal review</span>
          <h2>What we collect</h2>
          <p>
            When you place an order we collect only what we need to fulfil it:
          </p>
          <ul>
            <li>Your name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>
              Delivery address — only if you choose local delivery (pickup
              orders don&apos;t need one)
            </li>
          </ul>

          <h2>Why we collect it</h2>
          <p>
            {/* TODO: legal review — confirm wording covers all uses */}
            Solely to fulfil your order: preparing, confirming, and handing it
            over at pickup or delivering it to you. We use your phone or email
            to confirm details and let you know when your order is ready.
          </p>

          <h2>Payments</h2>
          <p>
            {/* TODO: legal review — confirm this matches actual payment flow */}
            We don&apos;t take payment online and no card details are ever
            stored on this site. Payment happens in person at pickup or on
            delivery.
          </p>

          <h2>Who else sees your information</h2>
          <p>
            {/* TODO: legal review — Australian Privacy Principles / small business exemption */}
            Nobody. We don&apos;t sell, rent or share your personal
            information. We don&apos;t run advertising trackers.
          </p>

          <h2>How long we keep it</h2>
          <p>
            {/* TODO: legal review — confirm retention period matches business/record-keeping rules */}
            Order records are kept only as long as needed for order fulfilment
            and reasonable business record-keeping, then deleted. You can ask
            us to delete your details sooner — see below.
          </p>

          <h2>Access, correction and deletion</h2>
          <p>
            You can ask what information we hold about you, ask us to correct
            it, or ask us to delete it. Contact us using the details below and
            we&apos;ll sort it out.
          </p>

          <h2>Contact for privacy requests</h2>
          <p>
            {contactEmail ? (
              <>
                Email us at{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and
                we&apos;ll respond as soon as we can.
              </>
            ) : (
              <>
                Our privacy contact email is being set up — check back soon or
                reach us on Instagram{" "}
                <a
                  href={config.site.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {config.site.instagramHandle}
                </a>
                .
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
