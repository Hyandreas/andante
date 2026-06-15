"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";

interface Audition {
  name: string;
  location: string;
  date: string;
  daysLeft: number;
  progress: number;
  // Present only when readiness can be computed from a tracked prep window.
  createdKey?: string;
}

interface Props { auditions: Audition[] }

// Readiness is only trustworthy when it's derived from a real prep window
// (created → audition date). Without that anchor, `progress` is a placeholder
// constant, so we don't render a percentage that would mislead the user.
function hasRealProgress(a: Audition): boolean {
  return typeof a.createdKey === "string" && Number.isFinite(a.progress) && a.progress > 0;
}

export function AuditionCards({ auditions }: Props) {
  const [open, setOpen] = useState<Audition | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {auditions.map((a, i) => (
          <button
            key={i}
            onClick={() => setOpen(a)}
            className="card card-lg reveal-up press"
            style={{
              animationDelay: `${i * 60}ms`,
              textAlign: "left", width: "100%", background: "var(--color-card-fill)",
            }}
          >
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="t-card-label">{a.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{a.location} · {a.date}</div>
              </div>
              <div className="muted"><Icon name="calendar" size={20} stroke={1.25} /></div>
            </div>
            <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 20 }}>
              <div className="t-stat-md">{a.daysLeft}</div>
              <div className="t-caption muted">DAYS</div>
            </div>
            {/* Readiness % is only shown when we have real prep data to back it.
                Without a tracked prep-start date it would be a fabricated
                constant, so we surface the live countdown instead. */}
            {hasRealProgress(a) ? (
              <>
                <div style={{ marginTop: 16 }}>
                  <ProgressBar value={a.progress} delay={i * 60} />
                </div>
                <div className="row-between" style={{ marginTop: 8 }}>
                  <div className="t-micro">Prep elapsed</div>
                  <div className="t-micro">{Math.round(a.progress * 100)}%</div>
                </div>
              </>
            ) : (
              <div className="t-micro" style={{ marginTop: 16 }}>
                {a.daysLeft > 0 ? `${a.daysLeft} days to prepare` : "Audition day"}
              </div>
            )}
          </button>
        ))}
      </div>

      <BottomSheet open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? "Audition"}>
        {open && (
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Date</span>
                <span className="t-card-label">{open.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Location</span>
                <span className="t-card-label">{open.location}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span className="t-caption muted">Days left</span>
                <span className="t-card-label">{open.daysLeft}</span>
              </div>
              {hasRealProgress(open) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                  <span className="t-caption muted">Prep elapsed</span>
                  <span className="t-card-label">{Math.round(open.progress * 100)}%</span>
                </div>
              )}
            </div>
            <div className="t-meta">
              Editing auditions requires a configured Supabase project.
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
