"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-in-view";

interface ReadinessRingProps {
  /** Value 0–1. */
  value: number;
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
  /** Animation duration. */
  duration?: number;
  /** Optional label rendered in the center. Defaults to `${pct}%`. */
  label?: string;
  /** Optional sub-label below the percentage. */
  sublabel?: string;
}

/**
 * Circular progress ring that fills from 0 → value when scrolled into view.
 * Uses tokens; no external deps. Counterpart to the existing flat progress bar.
 */
export function ReadinessRing({
  value,
  size = 88,
  stroke = 4,
  duration = 1100,
  label,
  sublabel,
}: ReadinessRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setShown(clamped);
      return;
    }
    const t0 = performance.now();
    const from = shown;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (clamped - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, reduced, duration]);

  const dashOffset = c * (1 - shown);
  const pct = Math.round(shown * 100);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-track-empty)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-text-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          style={{ transition: reduced ? undefined : "stroke-dashoffset 60ms linear" }}
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 500, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums" }}>
          {label ?? `${pct}%`}
        </span>
        {sublabel && (
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: 4 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
