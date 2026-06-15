"use client";

// "Active Repertoire" block on the home screen. Merges the local demo library
// with server pieces so a just-added piece appears here too — keeping home
// consistent with the Pieces screen.

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/motion/reveal";
import type { PieceCardData } from "@/lib/app-data";
import { toCardData, useLibraryStore } from "@/lib/local-library";

export function HomeRepertoire({ serverPieces }: { serverPieces: PieceCardData[] }) {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const localPieces = useLibraryStore((s) => s.pieces);
  useEffect(() => { hydrate(); }, [hydrate]);

  const merged = useMemo(
    () => [...localPieces.map(toCardData), ...serverPieces],
    [localPieces, serverPieces],
  );

  if (!hydrated && serverPieces.length === 0) {
    return <div style={{ minHeight: 80 }} />;
  }

  if (merged.length === 0) {
    return (
      <div className="card" style={{ padding: 8 }}>
        <EmptyState
          title="No repertoire yet"
          body="Add the piece you're working on and every session you log will count toward it."
          icon={<Icon name="music" size={18} />}
          action={
            <Link href="/pieces" className="cta" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", padding: "10px 18px", width: "auto" }}>
              Add a piece
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <Reveal delay={280} distance={10}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div className="t-section">Active Repertoire</div>
          <div className="t-micro">{merged.length} pieces</div>
        </div>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }} className="lg:!grid-cols-2">
        {merged.slice(0, 4).map((p, i) => (
          <Reveal key={p.id} delay={320 + i * 80} distance={10}>
            <Link
              href={`/pieces#${p.id}`}
              className="card press"
              style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, textDecoration: "none", color: "inherit" }}
            >
              <div className="row-between">
                <div className="t-micro">{p.role || "Repertoire"}</div>
                <div className="t-micro">{p.totalSessions} sessions</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2, lineHeight: 1.2 }}>{p.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{p.composer || "—"}</div>
              </div>
              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="t-micro">{p.weekTime}</span>
                  <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.progress * 100)}%</span>
                </div>
                <ProgressBar value={p.progress} delay={i * 70 + 300} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </>
  );
}
