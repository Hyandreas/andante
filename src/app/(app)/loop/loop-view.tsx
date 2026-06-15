"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";

const RAMP = [60, 72, 84, 96, 108, 120];
const PRESET_KEY = "andante.loopPreset";

interface LoopPreset {
  bpm: number;
  reps: number;
}

const BARS_PER_REP = 18; // mm. 41–58

export function LoopView() {
  const [bpm, setBpm] = useState(72);
  const [reps, setReps] = useState(3);
  const [running, setRunning] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Real rep counter: increments as the metronome completes loop passes, and
  // advances to the next tempo once `reps` clean passes land.
  const [iter, setIter] = useState(1);
  // Track the lowest/highest tempo actually reached this session for the summary.
  const [floorBpm, setFloorBpm] = useState(72);
  const [ceilBpm, setCeilBpm] = useState(72);
  const audioRef = useRef<AudioContext | null>(null);
  const tickIdRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const currentIdx = RAMP.indexOf(bpm);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LoopPreset;
      if (RAMP.includes(parsed.bpm)) setBpm(parsed.bpm);
      if ([2, 3, 5].includes(parsed.reps)) setReps(parsed.reps);
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (tickIdRef.current != null) {
        clearTimeout(tickIdRef.current);
        tickIdRef.current = null;
      }
      if (audioRef.current) {
        void audioRef.current.close();
        audioRef.current = null;
      }
    };
  }, []);

  const playClick = (ctx: AudioContext, accent = false) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1200;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  };

  const stopMetronome = () => {
    if (tickIdRef.current != null) {
      clearTimeout(tickIdRef.current);
      tickIdRef.current = null;
    }
    setRunning(false);
  };

  // Advance to the next tempo in the ramp and reset the rep counter.
  const advanceTempo = () => {
    const nextIdx = Math.min(RAMP.length - 1, RAMP.indexOf(bpm) + 1);
    const next = RAMP[nextIdx];
    setIter(1);
    setCeilBpm((c) => Math.max(c, next));
    setBpm(next);
  };

  const startMetronome = () => {
    if (typeof window === "undefined") return;
    if (running) {
      stopMetronome();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioRef.current) audioRef.current = new Ctx();
    void audioRef.current.resume();
    setFloorBpm((f) => Math.min(f, bpm));
    setCeilBpm((c) => Math.max(c, bpm));
    const interval = 60000 / bpm;
    const beatsPerPass = BARS_PER_REP * 4; // 4/4
    beatRef.current = 0;
    setRunning(true);
    const tick = () => {
      const ctx = audioRef.current;
      if (!ctx) return;
      const beat = beatRef.current;
      playClick(ctx, beat % 4 === 0);
      beatRef.current = beat + 1;
      // A full loop pass completed — count the rep and advance tempo at `reps`.
      if (beatRef.current % beatsPerPass === 0) {
        setIter((current) => {
          if (current >= reps) {
            // Reached the rep target: bump to the next tempo (restarts metronome
            // via the bpm effect) and reset the counter.
            queueMicrotask(advanceTempo);
            return 1;
          }
          return current + 1;
        });
      }
      tickIdRef.current = window.setTimeout(tick, interval);
    };
    tick();
  };

  useEffect(() => {
    if (!running) return;
    stopMetronome();
    // Restart at new tempo on bpm change while running.
    queueMicrotask(startMetronome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  const savePreset = () => {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify({ bpm, reps }));
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1800);
    } catch {}
  };

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="t-section" style={{ fontSize: 24, marginBottom: 6 }}>Loop Trainer</div>
          <div className="t-meta">Brahms Sonata No. 3 · Mvt. III · mm. 41–58</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedAt && <span className="t-meta" style={{ color: "var(--color-text-secondary)" }}>Saved.</span>}
          <button onClick={savePreset} className="press hidden md:!inline-block" style={{
            padding: "10px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13,
          }}>Save preset</button>
          <button onClick={startMetronome} className="press" style={{
            padding: "10px 18px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 13, fontWeight: 500,
          }}>{running ? "Stop loop" : `Begin loop · ♩ ${bpm}`}</button>
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
              <button onClick={() => { setIter(1); const next = RAMP[Math.max(0, currentIdx - 1)]; setFloorBpm((f) => Math.min(f, next)); setBpm(next); }} className="press" style={{
                width: 32, height: 32, borderRadius: 8, border: "0.5px solid var(--color-border)",
              }}>−</button>
              <button onClick={() => { setIter(1); const next = RAMP[Math.min(RAMP.length - 1, currentIdx + 1)]; setCeilBpm((c) => Math.max(c, next)); setBpm(next); }} className="press" style={{
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
                <button key={n} onClick={() => { setReps(n); setIter(1); }} className={`chip press ${reps === n ? "active" : ""}`}>
                  {n}×
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="t-micro">Today&apos;s progress</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6 }}>♩ {floorBpm} → {ceilBpm}</div>
            <ProgressBar value={Math.min(1, (currentIdx + iter / reps) / RAMP.length)} delay={200} />
            <div className="t-meta">{ceilBpm > floorBpm ? `+${ceilBpm - floorBpm} bpm this session` : "Build your ceiling — pass cleanly to climb"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
