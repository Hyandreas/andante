"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { PieceCardData } from "@/lib/app-data";

interface Props { pieces: PieceCardData[] }

export function PieceCards({ pieces }: Props) {
  const [open, setOpen] = useState<PieceCardData | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pieces.map((p, i) => (
          <button
            key={p.id}
            id={p.id}
            onClick={() => setOpen(p)}
            className="card reveal-up press"
            style={{
              animationDelay: `${i * 40}ms`,
              textAlign: "left", width: "100%", background: "var(--color-card-fill)",
            }}
          >
            <div className="row-between" style={{ alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="t-card-label">{p.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}{p.role ? ` · ${p.role}` : ""}</div>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
                <div className="t-card-label tabular">{Math.round(p.progress * 100)}%</div>
                <div className="t-meta" style={{ fontSize: 11 }}>{p.weekTime}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ProgressBar value={p.progress} delay={i * 40} />
            </div>
            <div className="row-between" style={{ marginTop: 12 }}>
              <div className="t-micro">{p.lastPracticed}</div>
              <div className="t-micro">{p.totalSessions} sessions</div>
            </div>
            <SheetStatusLine piece={p} />
          </button>
        ))}
      </div>

      <BottomSheet open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? "Piece"}>
        {open && (
          <div className="col" style={{ gap: 16 }}>
            <div className="t-meta">{open.composer}{open.role ? ` · ${open.role}` : ""}</div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Progress</span>
                <span className="t-card-label">{Math.round(open.progress * 100)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">This week</span>
                <span className="t-card-label">{open.weekTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Last practiced</span>
                <span className="t-card-label">{open.lastPracticed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                <span className="t-caption muted">Sessions</span>
                <span className="t-card-label">{open.totalSessions}</span>
              </div>
            </div>
            <SheetDetail piece={open} />
            <Link
              href="/session"
              onClick={() => setOpen(null)}
              className="cta"
              style={{ textAlign: "center", textDecoration: "none" }}
            >
              Start practice
            </Link>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

// Compact line on the card showing auto-discovered sheet music. The card is a
// <button>, so this stays a non-interactive span (no nested links).
function SheetStatusLine({ piece }: { piece: PieceCardData }) {
  if (!piece.sheetStatus || piece.sheetStatus === "idle") return null;

  if (piece.sheetStatus === "searching") {
    return (
      <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-text-muted)", animation: "breathe 1.4s ease-in-out infinite" }} />
        <span className="t-micro" style={{ textTransform: "none", letterSpacing: 0 }}>Finding sheet music…</span>
      </div>
    );
  }

  if (piece.sheetStatus === "found" && piece.sheet) {
    return (
      <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10, letterSpacing: 0.5, fontWeight: 500,
          padding: "3px 8px", borderRadius: 999,
          background: "var(--color-text-primary)", color: "var(--color-bg)",
        }}>♪ {piece.sheet.sourceName}</span>
        <span className="t-meta" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Sheet music linked
        </span>
      </div>
    );
  }

  return null;
}

// Sheet-music section inside the detail sheet — here we can render a real link.
function SheetDetail({ piece }: { piece: PieceCardData }) {
  return (
    <div className="card">
      <div className="t-micro" style={{ marginBottom: 10 }}>Sheet music</div>
      {piece.sheetStatus === "searching" && (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-text-muted)", animation: "breathe 1.4s ease-in-out infinite" }} />
          <span className="t-meta">Searching IMSLP for a matching edition…</span>
        </div>
      )}
      {piece.sheetStatus === "found" && piece.sheet && (
        <>
          <div className="t-body" style={{ fontWeight: 500, marginBottom: 2 }}>{piece.sheet.title}</div>
          <div className="t-meta" style={{ marginBottom: 12 }}>Auto-matched from {piece.sheet.sourceName} · public domain</div>
          <a
            href={piece.sheet.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 10,
              border: "0.5px solid var(--color-border)",
              fontSize: 13, fontWeight: 500, textDecoration: "none", color: "inherit",
            }}
          >
            View on {piece.sheet.sourceName} →
          </a>
        </>
      )}
      {(!piece.sheetStatus || piece.sheetStatus === "idle" || piece.sheetStatus === "none") && (
        <div className="t-meta">No automatic match found. You can import a score manually.</div>
      )}
    </div>
  );
}
