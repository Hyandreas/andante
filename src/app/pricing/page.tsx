"use client";

import Link from "next/link";
import { useState } from "react";

interface Feature { k: string; on: boolean; hint?: string }
interface Plan {
  id: "free" | "pro" | "studio";
  name: string;
  price?: string;
  monthly?: string;
  yearly?: string;
  cadence: string;
  yearlyNote?: string;
  blurb: string;
  cta: string;
  highlighted?: boolean;
  badge?: string;
  features: Feature[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Timer, streak, one piece, and a weekly chart. No card.",
    cta: "Get started free",
    features: [
      { k: "Daily timer + streak", on: true },
      { k: "1 active piece", on: true },
      { k: "Basic Log + week chart", on: true },
      { k: "Loop Trainer", on: false },
      { k: "Pathways (regional / competition)", on: false },
      { k: "Practice Rooms", on: false, hint: "View only" },
      { k: "Recordings + annotations", on: false },
      { k: "Leaderboards & cohort percentile", on: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: "$12",
    yearly: "$9",
    cadence: "/ month",
    yearlyNote: "$108 / year — save 25%",
    blurb: "For audition prep with multiple pieces, recordings, and feedback.",
    cta: "Upgrade to Pro",
    highlighted: true,
    badge: "Most students",
    features: [
      { k: "Unlimited pieces, sessions, recordings", on: true },
      { k: "Pathways (NYSSMA, CMIM, Asia pro-track, more)", on: true },
      { k: "Loop Trainer + Tempo Ramp", on: true },
      { k: "Leaderboards & cohort percentile", on: true },
      { k: "Submit takes for cohort + judge feedback", on: true },
      { k: "Mock-audition rooms (host + guest)", on: true },
      { k: "Annotations, A–B looping, export", on: true },
      { k: "Audition countdown widgets", on: true },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: "$29",
    cadence: "/ teacher / month",
    yearlyNote: "+ $4 / student / month",
    blurb: "For teachers running a studio with student logs, parent digests, and assignments.",
    cta: "Start studio trial",
    features: [
      { k: "Everything in Pro for every student", on: true },
      { k: "Studio dashboard with attendance + flags", on: true },
      { k: "Weekly digest emails to parents", on: true },
      { k: "Assignment broadcast to whole studio", on: true },
      { k: "Private feedback on every submitted take", on: true },
      { k: "Recital / jury report cards (PDF)", on: true },
      { k: "Branded student-facing portal", on: true },
      { k: "Stripe payouts for paid masterclasses", on: true },
    ],
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSelect = async (planId: string) => {
    if (planId === "free") { window.location.href = "/signup"; return; }
    if (pending) return;
    const cadence = yearly && planId === "pro" ? "yearly" : "monthly";
    setPending(planId);
    setNotice(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cadence }),
        signal: controller.signal,
      });
      if (!r.ok) {
        // Logged-out visitor: send them to sign up / sign in and return here,
        // instead of dead-ending in a toast.
        if (r.status === 401) {
          window.location.href = "/login?next=/pricing";
          return;
        }
        // Checkout isn't wired up in this environment — show a friendly message
        // rather than leaking the raw env/config error.
        if (r.status === 503) {
          setNotice("Checkout isn't available yet — email hello@andante.app to get started.");
          return;
        }
        const body = await r.json().catch(() => ({}));
        setNotice(body.error ?? "Checkout unavailable in this preview.");
        return;
      }
      const { url } = await r.json();
      if (url) window.location.href = url;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setNotice("Checkout timed out. Try again or contact support.");
      } else {
        setNotice("Checkout unavailable in this preview.");
      }
    } finally {
      clearTimeout(timeoutId);
      setPending(null);
    }
  };

  return (
    <div style={{ padding: "40px 24px 60px", overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 36 }}>
        <div className="t-micro" style={{ marginBottom: 10 }}>PRICING</div>
        <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: -1.4, lineHeight: 1.05, margin: "0 0 12px" }}>
          Pricing for the weeks<br />
          before the audition.
        </h1>
        <div className="t-meta" style={{ maxWidth: 540, marginBottom: 22 }}>
          Start free. Upgrade when you need more pieces, recordings, practice rooms, teacher feedback, or studio oversight.
        </div>
        <div style={{
          display: "inline-flex", padding: 4, borderRadius: 999,
          background: "var(--color-card-fill)", border: "0.5px solid var(--color-border)",
          gap: 4,
        }}>
          {[{ id: false, label: "Monthly" }, { id: true, label: "Yearly · save 25%" }].map((o) => (
            <button
              key={o.label}
              onClick={() => setYearly(o.id)}
              style={{
                padding: "8px 16px", borderRadius: 999, fontSize: 13,
                background: yearly === o.id ? "var(--color-text-primary)" : "transparent",
                color: yearly === o.id ? "var(--color-bg)" : "var(--color-text-primary)",
                fontWeight: yearly === o.id ? 500 : 400,
                transition: "background 200ms ease, color 200ms ease",
              }}
            >{o.label}</button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          gap: 14, maxWidth: 1100, margin: "0 auto",
        }}
        className="md:!grid-cols-3"
      >
        {PLANS.map((p, i) => {
          const dark = p.highlighted;
          const price = p.id === "pro" ? (yearly ? p.yearly : p.monthly) : p.price;
          return (
            <div
              key={p.id}
              style={{
                padding: 28, borderRadius: 14,
                background: dark ? "var(--color-text-primary)" : "var(--color-bg)",
                color: dark ? "var(--color-bg)" : "var(--color-text-primary)",
                border: "0.5px solid " + (dark ? "var(--color-text-primary)" : "var(--color-border)"),
                display: "flex", flexDirection: "column", gap: 16,
                position: "relative",
                animation: `revealUp 540ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`,
                minHeight: 540,
              }}
            >
              {p.badge && (
                <div style={{
                  position: "absolute", top: -10, right: 18,
                  background: "var(--color-bg)", color: "var(--color-text-primary)",
                  fontSize: 10, letterSpacing: 1.5, padding: "5px 10px", borderRadius: 999,
                  border: "0.5px solid var(--color-border)", fontWeight: 500,
                }}>{p.badge.toUpperCase()}</div>
              )}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.4, margin: 0 }}>{p.name}</h2>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6, lineHeight: 1.4 }}>{p.blurb}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, paddingTop: 4 }}>
                <span style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.4, fontVariantNumeric: "tabular-nums" }}>
                  {price}
                </span>
                <span style={{ fontSize: 13, opacity: 0.65 }}>{p.cadence}</span>
              </div>
              {p.yearlyNote && <div style={{ fontSize: 11, opacity: 0.5, marginTop: -10 }}>{p.yearlyNote}</div>}
              <button
                onClick={() => onSelect(p.id)}
                disabled={pending !== null && pending !== p.id}
                className="press"
                style={{
                  padding: "12px 18px", borderRadius: 10,
                  background: dark ? "var(--color-bg)" : "var(--color-text-primary)",
                  color: dark ? "var(--color-text-primary)" : "var(--color-bg)",
                  fontSize: 14, fontWeight: 500,
                  opacity: pending !== null && pending !== p.id ? 0.5 : 1,
                }}
              >{pending === p.id ? "Connecting…" : p.cta}</button>
              <div style={{ height: "0.5px", background: dark ? "color-mix(in srgb, var(--color-bg) 12%, transparent)" : "var(--color-border)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, opacity: f.on ? 1 : 0.4 }}>
                    <div style={{
                      marginTop: 4, width: 12, height: 12, borderRadius: 999,
                      background: f.on ? (dark ? "var(--color-bg)" : "var(--color-text-primary)") : "transparent",
                      border: f.on ? "none" : "0.5px dashed currentColor",
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      {f.on && (
                        <div style={{
                          width: 4, height: 4, borderRadius: 999,
                          background: dark ? "var(--color-text-primary)" : "var(--color-bg)",
                        }} />
                      )}
                    </div>
                    <div style={{ lineHeight: 1.45 }}>
                      {f.k}
                      {f.hint && <span style={{ opacity: 0.55, marginLeft: 6 }}>· {f.hint}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 48, maxWidth: 1100, margin: "48px auto 0",
        padding: "24px 28px",
        border: "0.5px solid var(--color-border)", borderRadius: 12,
        display: "grid", gap: 24,
      }} className="md:!grid-cols-4">
        {[
          ["Free", "timer, streak, one active piece"],
          ["Pro", "recordings, rooms, pathways, feedback"],
          ["Studio", "student logs, parent digests, assignments"],
          ["30 day", "money-back guarantee"],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="tabular" style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.6 }}>{n}</div>
            <div className="t-micro" style={{ marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: 1100, margin: "20px auto 0",
        padding: 20, background: "var(--color-card-fill)", borderRadius: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Teaching a studio of 8 or more?</div>
          <div className="t-meta">
            Studio plans bill per teacher with bulk student seats. Includes parent digests, branded portal, and Stripe payouts for masterclasses.
          </div>
        </div>
        <a
          href="mailto:hello@andante.app?subject=Studio%20pricing%20inquiry"
          className="press"
          style={{
            padding: "10px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
            textDecoration: "none", color: "inherit",
          }}
        >Talk to us →</a>
      </div>

      {notice && (
        <div
          role="alert"
          style={{
            position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            padding: "12px 20px", borderRadius: 10, fontSize: 13,
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 50, maxWidth: "calc(100vw - 48px)",
          }}
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            style={{ fontSize: 11, opacity: 0.75, color: "inherit", background: "transparent" }}
          >Dismiss</button>
        </div>
      )}
    </div>
  );
}
