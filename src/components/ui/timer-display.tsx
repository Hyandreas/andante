"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

function CharCell({ char }: { char: string }) {
  const firstRef = useRef(true);
  const [prev, setPrev] = useState(char);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    if (char !== prev) {
      setPrev(char);
      setAnimKey((k) => k + 1);
    }
  }, [char, prev]);

  const isDigit = /[0-9]/.test(char);
  if (!isDigit) {
    return (
      <span style={{ display: "inline-block", width: char === ":" ? "0.4em" : "auto", textAlign: "center" }}>
        {char}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-block", width: "0.62em", position: "relative",
      overflow: "hidden", height: "1em", verticalAlign: "top",
    }}>
      <span
        key={animKey}
        style={{
          display: "block",
          animation: animKey === 0 ? "none" : "digitSlide 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
          textAlign: "center",
        }}
      >
        {char}
      </span>
    </span>
  );
}

interface TimerDisplayProps {
  seconds: number;
  className?: string;
  style?: CSSProperties;
}

export function TimerDisplay({ seconds, className = "t-timer", style }: TimerDisplayProps) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const text = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className={className} style={{ display: "flex", gap: 0, ...style }}>
      {text.split("").map((c, i) => <CharCell key={i} char={c} />)}
    </div>
  );
}
