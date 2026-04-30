"use client";

import { useEffect, useState } from "react";

function useCountUp(target: number, duration = 1000, key: number = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const fallback = window.setTimeout(() => setV(target), duration + 100);
    return () => { cancelAnimationFrame(raf); clearTimeout(fallback); };
  }, [target, duration, key]);
  return v;
}

interface StatNumberProps {
  value: number;
  format?: (v: number) => string;
  className?: string;
  reKey?: number;
}

export function StatNumber({
  value,
  format = (v) => String(Math.round(v)),
  className = "t-stat",
  reKey = 0,
}: StatNumberProps) {
  const v = useCountUp(value, 1000, reKey);
  return <div className={className}>{format(v)}</div>;
}
