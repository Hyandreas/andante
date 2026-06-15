"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/env";

const STORAGE_KEY = "andante.demoBannerDismissed";

export function DemoBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setHidden(false);
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "8px 16px",
        background: "var(--color-card-fill-deep, #1a1a1a)",
        color: "var(--color-text-primary)",
        borderBottom: "0.5px solid var(--color-border)",
        fontSize: 12,
        letterSpacing: 0.2,
      }}
    >
      <span>
        Demo mode — Supabase isn&apos;t configured, so changes won&apos;t persist.
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss demo banner"
        style={{
          fontSize: 11,
          padding: "2px 8px",
          border: "0.5px solid var(--color-border)",
          borderRadius: 6,
          color: "inherit",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
