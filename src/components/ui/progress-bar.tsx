"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  value: number;
  animateOnMount?: boolean;
  delay?: number;
}

export function ProgressBar({ value, animateOnMount = true, delay = 0 }: ProgressBarProps) {
  const [w, setW] = useState(animateOnMount ? 0 : value);
  useEffect(() => {
    const t = setTimeout(() => setW(value), delay + 50);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, w)) * 100}%` }} />
    </div>
  );
}
