"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Waveform } from "@/components/ui/motion/waveform";
import { Reveal } from "@/components/ui/motion/reveal";
import { useToast } from "@/components/ui/motion/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { demoFixturesEnabled, isSupabaseConfigured } from "@/lib/env";

interface Rec {
  id: number;
  name: string;
  date: string;
  duration: string;
  piece: string;
  flagged: boolean;
}

const DEMO_RECS: Rec[] = [
  { id: 1, name: "Brahms III · mm. 41–58", date: "Today, 8:42 AM",   duration: "1:24", piece: "Brahms Sonata No. 3", flagged: true },
  { id: 2, name: "Brahms III · mm. 41–58", date: "Today, 8:38 AM",   duration: "1:18", piece: "Brahms Sonata No. 3", flagged: false },
  { id: 3, name: "Sibelius mvt. I exposition", date: "Yesterday, 7:48 PM", duration: "3:42", piece: "Sibelius Concerto", flagged: false },
  { id: 4, name: "Bach Adagio",            date: "Yesterday, 6:12 AM", duration: "4:08", piece: "Bach Sonata No. 1" , flagged: false },
  { id: 5, name: "Paganini Caprice 24 var. 7", date: "Mon · 7:42 PM",  duration: "0:54", piece: "Paganini Caprice 24", flagged: false },
];

const SPEEDS = [0.75, 1, 1.25] as const;

const DEMO_ANNOTATIONS = [
  { t: "0:08", note: "Bow change feels rushed — try upper half." },
  { t: "0:27", note: "Intonation flat on the F# in m. 49." },
  { t: "0:51", note: "Phrase shape is good here. Keep this." },
];

// With demo fixtures off, real/empty users see the empty state instead of
// fabricated clips. Annotations are equally demo-only.
const RECS: Rec[] = demoFixturesEnabled() ? DEMO_RECS : [];
const ANNOTATIONS = demoFixturesEnabled() ? DEMO_ANNOTATIONS : [];

function durationToSeconds(d: string) {
  const [m, s] = d.split(":").map(Number);
  return m * 60 + s;
}

function secondsToLabel(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function RecordingsView() {
  const toast = useToast();
  // `selected` is nullable so the hooks below are safe even when there are no
  // clips (real/empty user). Rendering bails to the empty state before any UI
  // that dereferences it.
  const [selected, setSelected] = useState<Rec | null>(RECS[0] ?? null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [loopAB, setLoopAB] = useState(false);
  const tickRef = useRef<number | null>(null);
  const total = selected ? durationToSeconds(selected.duration) : 0;
  const speed = SPEEDS[speedIdx];
  const canSend = isSupabaseConfigured();

  const loopA = total * 0.25;
  const loopB = total * 0.5;

  useEffect(() => {
    setPosition(0);
    setPlaying(false);
    setLoopAB(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!playing) {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setPosition((p) => {
        const next = p + 0.25 * speed;
        if (loopAB && next >= loopB) return loopA;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 250);
    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [playing, speed, loopAB, loopA, loopB, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playPosFrac = total > 0 ? position / total : 0;
  const annotationFracs = total > 0
    ? ANNOTATIONS.map((a) => {
        const [m, s] = a.t.split(":").map(Number);
        return (m * 60 + s) / total;
      })
    : [];

  if (RECS.length === 0 || !selected) {
    return (
      <EmptyState
        title="Record your first take"
        body="Press record at the end of a practice session — your takes appear here with annotations, A→B loop, and a one-tap send to your teacher."
        icon={<Icon name="play" size={20} />}
        fill
        action={
          <a
            href="/session"
            className="press"
            style={{
              padding: "12px 22px",
              borderRadius: 10,
              background: "var(--color-text-primary)",
              color: "var(--color-bg)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Start a session
          </a>
        }
      />
    );
  }

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
        {RECS.map((r, i) => (
          <Reveal key={r.id} delay={i * 40} distance={6} duration={420}>
            <button
              onClick={() => setSelected(r)}
              className="press"
              style={{
                width: "100%",
                padding: "16px 24px",
                borderBottom: "0.5px solid var(--color-border)",
                background: selected.id === r.id ? "var(--color-card-fill)" : "transparent",
                textAlign: "left",
                display: "flex", flexDirection: "column", gap: 4,
                transition: "background 160ms ease-out",
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
          </Reveal>
        ))}
      </div>

      <div
        key={selected.id}
        className="fade-in lg:!px-10"
        style={{ padding: "32px 24px 48px", display: "flex", flexDirection: "column", overflowY: "auto" }}
      >
        <div className="lg:!hidden" style={{ marginBottom: 12 }}>
          <div className="t-section" style={{ fontSize: 24 }}>Recordings</div>
        </div>

        {/* Mobile clip selector — the desktop list is hidden below lg, so on
            phones this chip row is the way to switch between clips. */}
        {RECS.length > 1 && (
          <div className="chip-row no-scrollbar lg:!hidden" style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4, marginBottom: 18 }}>
            {RECS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`chip press ${selected.id === r.id ? "active" : ""}`}
                style={{ whiteSpace: "nowrap" }}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
          <div className="t-micro">{selected.piece}</div>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.6 }}>{selected.name}</div>
          <div className="t-meta">{selected.date} · {selected.duration}</div>
        </div>

        <Waveform
          seed={`rec-${selected.id}`}
          position={playPosFrac}
          loop={loopAB ? { a: loopA / total, b: loopB / total } : null}
          markers={annotationFracs}
          height={180}
          onScrub={(frac) => setPosition(frac * total)}
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }} className="t-micro">
          <span>0:00</span>
          <span style={{ color: "var(--color-text-primary)" }}>{secondsToLabel(position)}</span>
          <span>{selected.duration}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="press"
            style={{
              padding: "12px 22px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10,
            }}
          >
            <Icon name={playing ? "pause" : "play"} size={14} /> {playing ? "Pause" : "Play"} <Kbd>Space</Kbd>
          </button>
          <button
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            className="press"
            style={{
              padding: "12px 18px", borderRadius: 10,
              border: "0.5px solid var(--color-border)",
              background: speed !== 1 ? "var(--color-card-fill)" : "transparent",
              fontSize: 14,
            }}
          >{speed}×</button>
          <button
            onClick={() => setLoopAB((v) => !v)}
            className="press"
            style={{
              padding: "12px 18px", borderRadius: 10,
              border: "0.5px solid var(--color-border)",
              background: loopAB ? "var(--color-card-fill)" : "transparent",
              fontSize: 14,
            }}
          >{loopAB ? "Loop on" : "Loop A → B"}</button>
          <button
            onClick={() => toast.show(canSend ? "Export started — we'll email when it's ready." : "Demo only — export needs a connected account.")}
            disabled={!canSend}
            className="press hidden md:!inline-block"
            style={{
              padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14, marginLeft: "auto",
              opacity: canSend ? 1 : 0.5,
            }}
          >Export{canSend ? "" : " (demo)"}</button>
          <button
            onClick={() => toast.show(canSend ? "Sent to your teacher." : "Demo only — connect an account to send.", { tone: canSend ? "success" : undefined })}
            disabled={!canSend}
            className="press hidden md:!inline-block"
            style={{ padding: "12px 18px", borderRadius: 10, border: "0.5px solid var(--color-border)", fontSize: 14, opacity: canSend ? 1 : 0.5 }}
          >Send to teacher{canSend ? "" : " (demo)"}</button>
        </div>

        <div className="t-section" style={{ fontSize: 16, marginBottom: 12 }}>Annotations</div>
        <div>
          {ANNOTATIONS.map((a, i, arr) => (
            <Reveal key={i} delay={i * 60} distance={6} duration={420}>
              <button
                onClick={() => {
                  const [m, s] = a.t.split(":").map(Number);
                  setPosition(m * 60 + s);
                }}
                className="press"
                style={{
                  display: "flex", gap: 16, padding: "14px 0",
                  borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border)" : "none",
                  width: "100%", textAlign: "left", background: "transparent",
                }}
              >
                <div className="tabular" style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 44 }}>{a.t}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{a.note}</div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
