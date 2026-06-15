import { Suspense } from "react";
import { SessionPageClient } from "@/components/session/session-page-client";

export default function SessionPage() {
  return (
    <Suspense fallback={<SessionFallback />}>
      <SessionPageClient />
    </Suspense>
  );
}

function SessionFallback() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 40,
      background: "var(--color-bg)",
      display: "grid",
      placeItems: "center",
    }}>
      <div className="t-meta">Loading session...</div>
    </div>
  );
}
