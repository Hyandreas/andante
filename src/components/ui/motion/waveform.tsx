"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-in-view";

interface WaveformProps {
  /** Stable id used to generate a deterministic waveform shape. */
  seed: string;
  /** Number of bars. */
  bars?: number;
  /** Playback position 0–1. */
  position: number;
  /** Optional loop region 0–1. */
  loop?: { a: number; b: number } | null;
  /** Marker positions 0–1 (annotations). */
  markers?: number[];
  /** Height in px. */
  height?: number;
  /** Fires when the user scrubs to a new fraction. */
  onScrub?: (frac: number) => void;
  /** Extra style. */
  style?: CSSProperties;
  /** Bar gap in px. */
  gap?: number;
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tactile waveform scrubber. Generates a deterministic seeded envelope
 * (so the same clip always looks the same) and animates the playhead.
 * Past bars are full-opacity, future bars are dim, the playhead column
 * pulses subtly. Clicking/dragging scrubs.
 *
 * Wire real audio later by replacing the seeded amplitude generator with
 * a decoded PCM peak array.
 */
export function Waveform({
  seed,
  bars = 96,
  position,
  loop = null,
  markers,
  height = 180,
  onScrub,
  style,
  gap = 2,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const reduced = usePrefersReducedMotion();

  const amplitudes = useMemo(() => {
    const rand = mulberry32(hashString(seed));
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      const x = i / bars;
      // Envelope shape: gentle attack, sustained middle, soft decay.
      const env = 0.32 + 0.62 * Math.pow(Math.sin(x * Math.PI), 0.55);
      // Detail noise so it doesn't look like a perfect arch.
      const jitter = 0.55 + 0.45 * rand();
      out.push(Math.max(0.08, Math.min(1, env * jitter)));
    }
    return out;
  }, [seed, bars]);

  const fracFromEvent = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const f = fracFromEvent(e.clientX);
      if (f != null) onScrub?.(f);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onScrub]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        setDragging(true);
        const f = fracFromEvent(e.clientX);
        if (f != null) onScrub?.(f);
      }}
      onMouseMove={(e) => {
        const f = fracFromEvent(e.clientX);
        setHoverFrac(f);
      }}
      onMouseLeave={() => setHoverFrac(null)}
      style={{
        position: "relative",
        height,
        display: "flex",
        alignItems: "center",
        gap,
        cursor: "pointer",
        userSelect: "none",
        ...style,
      }}
    >
      {amplitudes.map((amp, i) => {
        const x = (i + 0.5) / bars;
        const inLoop = loop ? x >= loop.a && x <= loop.b : false;
        const past = x <= position;
        const dist = Math.abs(x - position);
        // Glow falloff around the playhead.
        const glow = reduced ? 0 : Math.max(0, 1 - dist * 14);
        const baseOpacity = past ? 0.86 : inLoop ? 0.62 : 0.32;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              // Fixed precision so server and client render byte-identical
              // strings (Math.sin/pow can differ in the last ULP across
              // engines, which otherwise trips a hydration mismatch).
              height: `${(amp * 100).toFixed(2)}%`,
              background: "var(--color-text-primary)",
              opacity: Math.min(1, baseOpacity + glow * 0.18),
              transform: glow > 0 ? `scaleY(${1 + glow * 0.06})` : undefined,
              transformOrigin: "center",
              transition: reduced ? undefined : "opacity 140ms linear, transform 140ms linear",
              borderRadius: 1,
            }}
          />
        );
      })}

      {/* Loop region overlay */}
      {loop && (
        <>
          <div
            style={{
              position: "absolute",
              left: `${loop.a * 100}%`,
              right: `${(1 - loop.b) * 100}%`,
              top: 0,
              bottom: 0,
              background: "color-mix(in srgb, var(--color-text-primary) 6%, transparent)",
              pointerEvents: "none",
              borderLeft: "0.5px solid var(--color-text-secondary)",
              borderRight: "0.5px solid var(--color-text-secondary)",
            }}
          />
          <LoopHandle frac={loop.a} label="A" />
          <LoopHandle frac={loop.b} label="B" />
        </>
      )}

      {/* Annotation markers */}
      {markers?.map((m, i) => (
        <div
          key={`m-${i}`}
          style={{
            position: "absolute",
            left: `${m * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
            width: 7,
            height: 7,
            background: "var(--color-text-primary)",
            borderRadius: 999,
            border: "1.5px solid var(--color-bg)",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Hover guide */}
      {hoverFrac != null && (
        <div
          style={{
            position: "absolute",
            left: `${hoverFrac * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--color-text-secondary)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Playhead */}
      <div
        style={{
          position: "absolute",
          left: `${position * 100}%`,
          top: -4,
          bottom: -4,
          width: 1.5,
          background: "var(--color-text-primary)",
          pointerEvents: "none",
          boxShadow: reduced
            ? undefined
            : "0 0 12px color-mix(in srgb, var(--color-text-primary) 50%, transparent)",
        }}
      />
    </div>
  );
}

function LoopHandle({ frac, label }: { frac: number; label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${frac * 100}%`,
        top: -10,
        transform: "translateX(-50%)",
        width: 18,
        height: 18,
        borderRadius: 4,
        background: "var(--color-text-primary)",
        color: "var(--color-bg)",
        display: "grid",
        placeItems: "center",
        fontSize: 10,
        letterSpacing: 0.5,
        pointerEvents: "none",
      }}
    >
      {label}
    </div>
  );
}
