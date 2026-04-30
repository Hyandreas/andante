"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";

const RECS = [
  { id: 1, name: "Brahms III · mm. 41–58", date: "Today, 8:42 AM",   duration: "1:24", piece: "Brahms Sonata No. 3", flagged: true },
  { id: 2, name: "Brahms III · mm. 41–58", date: "Today, 8:38 AM",   duration: "1:18", piece: "Brahms Sonata No. 3", flagged: false },
  { id: 3, name: "Sibelius mvt. I exposition", date: "Yesterday, 7:48 PM", duration: "3:42", piece: "Sibelius Concerto", flagged: false },
  { id: 4, name: "Bach Adagio",            date: "Yesterday, 6:12 AM", duration: "4:08", piece: "Bach Sonata No. 1", flagged: false },
  { id: 5, name: "Paganini Caprice 24 var. 7", date: "Mon · 7:42 PM",  duration: "0:54", piece: "Paganini Caprice 24", flagged: false },
];

export default function RecordingsPage() {
  const [selected, setSelected] = useState(RECS[0]);

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr)", overflow: "hidden" }} className="lg:!grid-cols-[360px_1fr]">
      <div className="hidden lg:!block" style={{ borderRight: "0.5px solid var(--color-border)", overflowY: "auto" }}>
        <div style={{
          padding: "24px 24px 12px", position: "sticky", top: 0,
          background: "var(--color-bg)", borderBottom: "0.5px solid var(--color-border)",
        }}>
          <div className="t-section" style={{ fontSize: 20 }}>Recordings</div>
          <div className="t-meta" style={{ marginTop: 4 }}>{RECS.length} clips · 13:38 total</div>
        </div>
        {RECS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="press"
            style={{
              width: "100%",
              padding: "16px 24px",
              borderBottom: "0.5px solid var(--color-border)",
              background: selected.id === r.id ? "var(--color-card-fill)" : "transparent",
              textAlign: "left",
              display: "flex", flexDirection: "column", gap: 4,
            }}
          >
            <div className="row-between">
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
              <span className="tabular" style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{r.duration}</span>
            </div>
            <div className="row-between">
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{r.date}</span>
              {r.flagged && <span className="t-micro" style={{ color: "var(--color-text-primary)" }}>⚑ flagged</span>}
            </div>
          </button>
        ))}
      </div>

      <div style={{ padding: "32px 24px 48px", display: "flex", flexDirection: "column", overflowY: "auto" }} className="lg:!px-10">
        <div className="lg:!hidden" style={{ marginBottom: 12 }}>
          <div className="t-section" style={{ fontSize: 24 }}>Recordings</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
          <div className="t-micro">{selected.piece}</div>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.6 }}>{selected.name}</div>
          <div className="t-meta">{selected.date} · {selected.duration}</div>
        </div>

        {/* Static waveform stand-in */}
        <div style={{ height: 180, marginBottom: 16, position: "relative", display: "flex", gap: 2, alignItems: "center" }}>
          {Array.from({ length: 80 }).map((_, i) => {
            const x = i / 80;
            const env = 0.35 + 0.55 * Math.pow(Math.sin(x * Math.PI), 0.7);
            return (
              <div key={i} style={{ flex: 1, height: `${env * 100}%`, background: "var(--color-text-primary)", opacity: 0.6 }} />
            );
          })}
          <div style={{ position: "absolute", left: "32%", top: 0, bottom: 0, width: 1.5, background: "var(--color-text-primary)" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }} className="t-micro">
          <span>0:00</span><span style={{ color: "var(--color-text-primary)" }}>0:27</span><span>{selected.duration}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          <button className="press" style={{
            padding: "12px 22px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10,
          }}>
            <Icon name="play" size={14} /> Play <Kbd>Space</Kbd>
          </button>
          <button className="press" style={{
            padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14,
          }}>0.75×</button>
          <button className="press" style={{
            padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14,
          }}>Loop A → B</button>
          <button className="press hidden md:!inline-block" style={{
            padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14, marginLeft: "auto",
          }}>Export</button>
          <button className="press hidden md:!inline-block" style={{
            padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14,
          }}>Send to teacher</button>
        </div>

        <div className="t-section" style={{ fontSize: 16, marginBottom: 12 }}>Annotations</div>
        <div>
          {[
            { t: "0:08", note: "Bow change feels rushed — try upper half." },
            { t: "0:27", note: "Intonation flat on the F# in m. 49." },
            { t: "0:51", note: "Phrase shape is good here. Keep this." },
          ].map((a, i, arr) => (
            <div key={i} style={{
              display: "flex", gap: 16, padding: "14px 0",
              borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border)" : "none",
            }}>
              <div className="tabular" style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 44 }}>{a.t}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{a.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
