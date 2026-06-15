import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      padding: "40px 24px",
      background: "var(--color-bg)",
      color: "var(--color-text-primary)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: "uppercase" }}>
        404
      </div>
      <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, textAlign: "center", lineHeight: 1.15 }}>
        This page doesn&apos;t exist.
      </div>
      <p style={{ fontSize: 15, opacity: 0.55, textAlign: "center", maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        It may have moved, or you followed a broken link. Head back to the homepage and pick up where you left off.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <Link
          href="/"
          style={{
            height: 44,
            paddingLeft: 20,
            paddingRight: 20,
            borderRadius: 10,
            background: "var(--color-text-primary)",
            color: "var(--color-bg)",
            fontSize: 14,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          Back to homepage
        </Link>
        <Link
          href="/login"
          style={{
            height: 44,
            paddingLeft: 20,
            paddingRight: 20,
            borderRadius: 10,
            border: "0.5px solid var(--color-border)",
            color: "var(--color-text-primary)",
            fontSize: 14,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
