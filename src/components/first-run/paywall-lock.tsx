"use client";

// The "visible but locked" treatment for a Pro screen. The real page renders
// blurred underneath (so the value is visible); this sits on top with a clear
// lock + upgrade path. Used by ProGate.

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/first-run/analytics";
import { GIFTED_FEATURE, PRO_PRICE_MONTHLY, type ScreenDef } from "@/lib/first-run/config";

function Padlock() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1.2" />
    </svg>
  );
}

export function PaywallLock({ screen }: { screen: ScreenDef }) {
  const router = useRouter();

  useEffect(() => {
    track("paywall_lock_viewed", { id: screen.id });
  }, [screen.id]);

  const giftable = screen.id === GIFTED_FEATURE;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "color-mix(in srgb, var(--color-bg) 62%, transparent)",
        backdropFilter: "saturate(120%)",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 360,
          textAlign: "center",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          border: "0.5px solid var(--color-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "revealUp 420ms var(--ease-out-expo) both",
        }}
      >
        <div
          style={{
            width: 52, height: 52, borderRadius: 14,
            display: "grid", placeItems: "center",
            background: "var(--color-text-primary)", color: "var(--color-bg)",
          }}
        >
          <Padlock />
        </div>
        <div className="t-micro">PRO FEATURE</div>
        <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: -0.4, lineHeight: 1.2 }}>
          {screen.label} is part of Pro.
        </div>
        <p className="t-meta" style={{ margin: 0 }}>
          {giftable
            ? "This one's on us if you stay on Free — or unlock everything with Pro."
            : `Unlock ${screen.label} and the full audition-prep toolkit with Pro, from ${PRO_PRICE_MONTHLY}/mo.`}
        </p>
        <button
          className="cta"
          style={{ marginTop: 8, width: "100%" }}
          onClick={() => { track("paywall_lock_cta", { id: screen.id }); router.push("/pricing"); }}
        >
          See Pro plans
        </button>
      </div>
    </div>
  );
}
