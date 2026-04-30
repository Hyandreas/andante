"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";

const RAMP = [60, 72, 84, 96, 108, 120];

export default function LoopPage() {
  const [bpm, setBpm] = useState(72);
  const [reps, setReps] = useState(3);
  const iter = 2;
  const currentIdx = RAMP.indexOf(bpm);

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="t-section" style={{ fontSize: 24, marginBottom: 6 }}>Loop Trainer</div>
          <div className="t-meta">Brahms Sonata No. 3 · Mvt. III · mm. 41–58</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="press hidden md:!inline-block" style={{
            padding: "10px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13,
          }}>Save preset</button>
          <button className="press" style={{
            padding: "10px 18px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 13, fontWeight: 500,
          }}>Begin loop · ♩ {bpm}</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)" }} className="lg:!grid-cols-[1.6fr_1fr]">
        <div className="card" style={{ padding: 28 }}>
          <div className="t-micro" style={{ marginBottom: 16 }}>Tempo Ramp</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200 }}>
            {RAMP.map((b, i) => {
              const isPast = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={b} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{
                      width: "100%",
                      height: `${((i + 1) / RAMP.length) * 100}%`,
                      background: isCurrent ? "var(--color-text-primary)" : isPast ? "var(--color-bar-past)" : "var(--color-bar-future)",
                      transition: "background 240ms ease",
                    }} />
                  </div>
                  <div className="tabular" style={{ fontSize: 14, fontWeight: isCurrent ? 500 : 400 }}>{b}</div>
                  <div className="t-micro">{isPast ? "✓" : isCurrent ? `${iter}/${reps}` : "—"}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="t-meta">Pass cleanly {reps}× to advance to next tempo. Miss once, stay.</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setBpm(RAMP[Math.max(0, currentIdx - 1)])} className="press" style={{
                width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--color-border)",
              }}>−</button>
              <button onClick={() => setBpm(RAMP[Math.min(RAMP.length - 1, currentIdx + 1)])} className="press" style={{
                width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--color-border)",
              }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="t-micro" style={{ marginBottom: 8 }}>Loop Boundary</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>mm. 41 — 58</div>
            <div className="t-meta">18 bars · 4/4 · ~32s at ♩ 72</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="t-micro" style={{ marginBottom: 12 }}>Reps to advance</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[2, 3, 5].map((n) => (
                <button key={n} onClick={() => setReps(n)} className={`chip press ${reps === n ? "active" : ""}`}>
                  {n}×
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="t-micro">Today's progress</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6 }}>♩ 60 → 92</div>
            <ProgressBar value={(currentIdx + iter / reps) / RAMP.length} delay={200} />
            <div className="t-meta">+12 bpm vs. yesterday's ceiling</div>
          </div>
        </div>
      </div>
    </div>
  );
}
