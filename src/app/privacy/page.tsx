import type { Metadata } from "next";
import Link from "next/link";
import "./privacy.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Andante collects, uses, and protects your information — including our children's-privacy (COPPA) stance. Andante is intended for users aged 13 and older.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Andante",
    description:
      "How Andante collects, uses, and protects your information, and our children's-privacy (COPPA) stance.",
    url: "/privacy",
  },
};

const UPDATED = "June 9, 2026";

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <header className="legal-top">
        <Link href="/" className="legal-home">← Andante</Link>
        <nav className="legal-top-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </header>

      <article className="legal">
        <p className="legal-eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated {UPDATED}</p>

        <p>
          This Privacy Policy explains how Andante (&ldquo;Andante,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
          collects, uses, and protects information when you use our website and practice-tracking
          application (the &ldquo;Service&rdquo;). By using the Service you agree to this policy.
        </p>
        <p className="legal-callout">
          <strong>Andante is intended for people aged 13 and older.</strong> We do not knowingly collect
          personal information from children under 13. See <a href="#children">Children&rsquo;s Privacy</a> below.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account information.</strong> When you create an account we collect your email
            address and authentication credentials (managed by our auth provider; we do not store your
            password in plaintext).
          </li>
          <li>
            <strong>Profile you provide.</strong> Optional details you enter during onboarding or in
            settings — such as a display name, instrument, role, experience level, age range (13+),
            country/region, and practice habits and goals.
          </li>
          <li>
            <strong>Practice content you create.</strong> Practice sessions and timers, repertoire/pieces,
            logs and notes, goals, recordings you choose to capture, and audition deadlines.
          </li>
          <li>
            <strong>Payment information.</strong> If you subscribe, payments are processed by Stripe.
            Andante does not receive or store full card numbers; we keep a subscription status and
            billing identifiers needed to manage your plan.
          </li>
          <li>
            <strong>Device &amp; technical data.</strong> Standard information such as browser type and
            settings, and identifiers needed for features you enable (for example, a push-notification
            subscription if you opt in).
          </li>
        </ul>

        <h2>Local-first storage</h2>
        <p>
          Some of your data is stored locally in your browser (for example, theme and motion
          preferences, and practice sessions queued while offline) using <code>localStorage</code> and
          IndexedDB. Offline sessions are synced to your account when you reconnect. Data kept only on
          your device stays there unless and until it syncs.
        </p>

        <h2>How we use information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service and your practice log.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To process subscriptions and send transactional messages (e.g. receipts, account notices).</li>
          <li>To send updates you opt into, such as a weekly practice digest to a parent or teacher.</li>
          <li>To understand, in aggregate, how the Service is used so we can improve it.</li>
        </ul>
        <p>We do not sell your personal information.</p>

        <h2>Service providers</h2>
        <p>We share information only with providers that help us run the Service, under their terms:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting.</li>
          <li><strong>Stripe</strong> — payment processing and subscription management.</li>
          <li><strong>Resend</strong> — sending email (such as the practice digest).</li>
          <li><strong>Vercel</strong> — website and application hosting.</li>
          <li><strong>Web Push services</strong> — delivering notifications you opt into.</li>
        </ul>

        <h2>Cookies &amp; similar technologies</h2>
        <p>
          We use cookies and local storage that are necessary to sign you in, keep your session, and
          remember preferences. We do not use them to build advertising profiles.
        </p>

        <h2 id="children">Children&rsquo;s Privacy (COPPA)</h2>
        <p>
          The Service is intended for users aged <strong>13 and older</strong> and is not directed to
          children under 13. We do not knowingly collect personal information from anyone under 13, and
          our onboarding does not request data from users who identify as under 13.
        </p>
        <p>
          Where a parent, guardian, or teacher sets up Andante on behalf of a younger student, the
          account is held and managed by the adult, and we do not knowingly collect personal information
          directly from the child.
        </p>
        <p>
          If you believe a child under 13 has provided us with personal information, please contact us at{" "}
          <a href="mailto:privacy@andante.app">privacy@andante.app</a> and we will delete it promptly. A
          parent or guardian may review, request deletion of, or refuse further collection of their
          child&rsquo;s information by contacting the same address.
        </p>

        <h2>Your rights &amp; choices</h2>
        <p>
          You may access, correct, export, or delete your information. You can update most details in
          Settings, or contact us to request access or deletion. Depending on where you live, you may
          have additional rights under laws such as the GDPR or CCPA; we honor applicable requests.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep your information for as long as your account is active or as needed to provide the
          Service. When you delete your account, we delete or de-identify your personal information,
          except where we must retain it to comply with legal obligations.
        </p>

        <h2>Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect your information. No method
          of transmission or storage is perfectly secure, but we work to safeguard your data and limit
          access to it.
        </p>

        <h2>International users</h2>
        <p>
          Andante is operated from, and your information may be processed in, countries other than your
          own. By using the Service you understand your information may be transferred to and processed
          in those countries.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. When we do, we will revise the &ldquo;Last
          updated&rdquo; date above, and for material changes we will provide a more prominent notice.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your data? Email{" "}
          <a href="mailto:privacy@andante.app">privacy@andante.app</a>.
        </p>

        <footer className="legal-foot">
          <Link href="/">Back to home</Link>
          <span>Andante · {new Date().getFullYear()}</span>
        </footer>
      </article>
    </div>
  );
}
