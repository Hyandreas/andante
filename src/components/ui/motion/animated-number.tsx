"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-in-view";

interface AnimatedNumberProps {
  value: number;
  /** Animation duration in ms. */
  duration?: number;
  /** Fixed decimal places to render. */
  decimals?: number;
  /** Suffix appended after the number (e.g. "%", "h"). */
  suffix?: string;
  /** Prefix prepended before the number (e.g. "+"). */
  prefix?: string;
  /** Optional className. */
  className?: string;
  /** Tabular numbers by default. */
  tabular?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  suffix,
  prefix,
  className,
  tabular = true,
}: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
     
  }, [value, reduced, duration]);

  const rendered =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: tabular ? "tabular-nums" : undefined }}
    >
      {prefix}
      {rendered}
      {suffix}
    </span>
  );
}
