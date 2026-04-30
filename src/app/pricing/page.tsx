"use client";

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
    cta: "Current plan",
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

  const onSelect = async (planId: string) => {
    if (planId === "free") return;
    const cadence = yearly && planId === "pro" ? "yearly" : "monthly";
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cadence }),
      });
      if (!r.ok) {
        // Without configured Stripe envs we just let the user know — full
        // flow is wired through the webhook on a real environment.
        const body = await r.json().catch(() => ({}));
        alert(body.error ?? "Checkout unavailable in this preview.");
        return;
      }
      const { url } = await r.json();
      window.location.href = url;
    } catch {
      alert("Checkout unavailable in this preview.");
    }
  };

  return (
    <div style={{ padding: "40px 24px 60px", overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 36 }}>
        <div className="t-micro" style={{ marginBottom: 10 }}>PRICING</div>
        <div style={{ fontSize: 42, fontWeight: 500, letterSpacing: -1.4, lineHeight: 1.05, marginBottom: 12 }}>
          Pricing for the weeks<br />
          before the audition.
        </div>
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
                <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.4 }}>{p.name}</div>
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
                className="press"
                style={{
                  padding: "12px 18px", borderRadius: 10,
                  background: dark ? "var(--color-bg)" : "var(--color-text-primary)",
                  color: dark ? "var(--color-text-primary)" : "var(--color-bg)",
                  fontSize: 14, fontWeight: 500,
                }}
              >{p.cta}</button>
              <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.12)" : "var(--color-border)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, opacity: f.on ? 1 : 0.4 }}>
                    <div style={{
                      marginTop: 4, width: 12, height: 12, borderRadius: 999,
                      background: f.on ? (dark ? "var(--color-bg)" : "var(--color-text-primary)") : "transparent",
                      border: f.on ? "none" : "1px dashed currentColor",
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
        <button className="press" style={{
          padding: "10px 18px", borderRadius: 10,
          border: "0.5px solid var(--color-border)", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
        }}>Talk to us →</button>
      </div>
    </div>
  );
}
