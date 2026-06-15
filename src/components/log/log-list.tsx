"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { SessionItem, SessionGroup } from "@/lib/sample-data";

interface Props {
  groups: SessionGroup[];
  weekTotal: string;
  monthTotal: string;
}

const FOCUSES = ["All", "Repertoire", "Scales", "Etudes", "Sight-Reading"] as const;
type Focus = (typeof FOCUSES)[number];

export function LogList({ groups, weekTotal, monthTotal }: Props) {
  const [focus, setFocus] = useState<Focus>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<{ s: SessionItem; date: string } | null>(null);

  const filteredGroups = useMemo(() => {
    if (focus === "All") return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((s) => s.focus === focus) }))
      .filter((g) => g.items.length > 0);
  }, [groups, focus]);

  return (
    <>
      <div className="row-between" style={{ padding: "32px 24px 12px" }} >
        <div className="t-section" style={{ fontSize: 24 }}>Log</div>
        <button
          onClick={() => setFilterOpen(true)}
          className="press"
          aria-label="Filter sessions"
          style={{
            width: 32, height: 32, display: "grid", placeItems: "center",
            position: "relative",
          }}
        >
          <Icon name="filter" size={22} />
          {focus !== "All" && (
            <span style={{
              position: "absolute", top: 4, right: 4,
              width: 7, height: 7, borderRadius: 999,
              background: "var(--color-text-primary)",
            }} />
          )}
        </button>
      </div>

      <div style={{ background: "var(--color-card-fill)", padding: "16px 24px", display: "flex", gap: 32 }}>
        <div>
          <div className="t-micro">This Week</div>
          <div className="t-card-label tabular" style={{ marginTop: 4, fontSize: 18 }}>{weekTotal}</div>
        </div>
        <div style={{ width: "0.5px", background: "var(--color-border)" }} />
        <div>
          <div className="t-micro">This Month</div>
          <div className="t-card-label tabular" style={{ marginTop: 4, fontSize: 18 }}>{monthTotal}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 24px 48px", overflowY: "auto" }} className="lg:!px-10">
        {groups.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.4 }}>No sessions logged yet</div>
            <div className="t-meta" style={{ maxWidth: 300 }}>Start a practice session and it&rsquo;ll show up here — with a weekly and monthly total.</div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="t-meta" style={{ padding: "24px 0" }}>
            No sessions match this filter.
          </div>
        ) : (
          filteredGroups.map((g) => (
            <div key={g.date}>
              <div className="log-date-header t-caption muted">{g.date}</div>
              <div className="col">
                {g.items.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected({ s, date: g.date })}
                    className="press"
                    style={{
                      padding: "14px 0", borderBottom: "0.5px solid var(--color-border)",
                      textAlign: "left", width: "100%", background: "transparent",
                    }}
                  >
                    <div className="row-between">
                      <div className="row" style={{ gap: 12 }}>
                        <div className="t-card-label" style={{ fontSize: 14 }}>{s.start}</div>
                        <div className="t-meta">{s.duration}</div>
                      </div>
                      <div className="t-caption muted" style={{ fontSize: 11 }}>{s.focus}</div>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {s.pieces.map((p, j) => (
                        <span key={j} style={{
                          background: "var(--color-card-fill)",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11,
                        }}>{p}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
        <div style={{ height: 40 }} />
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter">
        <div className="t-micro" style={{ marginBottom: 10 }}>Focus type</div>
        <div className="chip-row" style={{ flexWrap: "wrap", gap: 6 }}>
          {FOCUSES.map((f) => (
            <button
              key={f}
              onClick={() => { setFocus(f); setFilterOpen(false); }}
              className={`chip press ${focus === f ? "active" : ""}`}
            >{f}</button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={selected !== null} onClose={() => setSelected(null)} title="Session">
        {selected && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
              <span className="t-caption muted">Date</span>
              <span className="t-card-label">{selected.date}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
              <span className="t-caption muted">Start</span>
              <span className="t-card-label">{selected.s.start}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
              <span className="t-caption muted">Duration</span>
              <span className="t-card-label">{selected.s.duration}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border)" }}>
              <span className="t-caption muted">Focus</span>
              <span className="t-card-label">{selected.s.focus}</span>
            </div>
            <div style={{ padding: "12px 0" }}>
              <div className="t-caption muted" style={{ marginBottom: 8 }}>Pieces</div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {selected.s.pieces.map((p, j) => (
                  <span key={j} style={{
                    background: "var(--color-card-fill)", borderRadius: 999,
                    padding: "5px 12px", fontSize: 12,
                  }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
