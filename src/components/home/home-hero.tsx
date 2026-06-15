"use client";

// Hero inner content. Reflects the local demo library so that, once a user has
// added a piece (onboarding or otherwise), the home hero shows it as the active
// piece instead of the empty "start your first session" prompt.

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Kbd } from "@/components/ui/kbd";
import type { PieceCardData } from "@/lib/app-data";
import { toCardData, useLibraryStore } from "@/lib/local-library";

export function HomeHero({
  dateLabel,
  serverActivePiece,
}: {
  dateLabel: string;
  serverActivePiece: PieceCardData | null;
}) {
  const router = useRouter();
  const hydrate = useLibraryStore((s) => s.hydrate);
  const localPieces = useLibraryStore((s) => s.pieces);
  useEffect(() => { hydrate(); }, [hydrate]);

  // The hero advertises pressing "S" to start practice — wire it up. Ignore the
  // keystroke while typing in a field, and don't hijack browser/OS shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "s") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      e.preventDefault();
      router.push("/session");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const active = useMemo<PieceCardData | null>(
    () => (localPieces.length > 0 ? toCardData(localPieces[0]) : serverActivePiece),
    [localPieces, serverActivePiece],
  );

  return (
    <>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55 }}>
        {dateLabel}
      </div>
      <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.4, marginTop: 8, lineHeight: 1.1 }}>
        {active ? <>Pick up where<br />you left off.</> : <>Start your<br />first session.</>}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        {active ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="t-micro" style={{ opacity: 0.6 }}>Active piece</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{active.name}</div>
            {active.composer && <div style={{ fontSize: 12, opacity: 0.5 }}>{active.composer}</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 220 }}>
            <div className="t-micro" style={{ opacity: 0.6 }}>No active piece yet</div>
            <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.4 }}>Press start — your minutes and streak begin today.</div>
          </div>
        )}
        <Link
          href="/session"
          className="press"
          style={{
            background: "var(--color-bg)",
            color: "var(--color-text-primary)",
            padding: "14px 24px",
            borderRadius: 10,
            fontSize: 14, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 10,
            textDecoration: "none",
          }}
        >
          Start Practice
          <Kbd>S</Kbd>
        </Link>
      </div>
    </>
  );
}
