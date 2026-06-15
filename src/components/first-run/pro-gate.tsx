"use client";

// Wraps the (app) content. If the current route is a Pro feature the user
// isn't entitled to, ONLY the paywall renders — the gated children are NOT
// mounted, so they can't be read out of the DOM via devtools. (This is a
// client-side guard; real enforcement still belongs on the server.) Otherwise
// children render untouched (no layout change).

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isFeatureUnlocked, screenForPath } from "@/lib/first-run/entitlement";
import { useFirstRunStore } from "@/lib/first-run/store";
import { PaywallLock } from "./paywall-lock";

export function ProGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const data = useFirstRunStore((s) => s.data);

  const screen = screenForPath(pathname);
  const gated = screen?.tier === "pro" && !isFeatureUnlocked(data, screen.id);

  if (!gated || !screen) return <>{children}</>;

  // Do NOT render `children` when locked — render a non-interactive blurred
  // placeholder so the layout/visual stays intact without exposing the gated
  // content in the DOM.
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div
        aria-hidden
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          filter: "blur(7px)",
          opacity: 0.55,
          pointerEvents: "none",
          userSelect: "none",
          background:
            "repeating-linear-gradient(135deg, var(--color-card-fill) 0 18px, var(--color-bg) 18px 36px)",
        }}
      />
      <PaywallLock screen={screen} />
    </div>
  );
}
