"use client";

import { useEffect, useMemo, useState } from "react";
import { FEED_EVENTS } from "@/lib/sample-data";

const ICON: Record<string, string> = {
  kudo: "K", milestone: "M", join: "J", submit: "T", rank: "R",
};

interface SocialFeedProps {
  compact?: boolean;
}

export function SocialFeed({ compact = false }: SocialFeedProps) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % FEED_EVENTS.length), 3200);
    return () => window.clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const a = [];
    const n = compact ? 3 : 4;
    for (let i = 0; i < n; i++) a.push(FEED_EVENTS[(idx + i) % FEED_EVENTS.length]);
    return a;
  }, [idx, compact]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {visible.map((e, i) => (
        <div
          key={`${idx}-${i}-${e.who}`}
          style={{
            display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10,
            alignItems: "center",
            padding: "9px 0",
            borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.12)",
            animation: i === 0 ? "feedSlide 480ms cubic-bezier(0.16,1,0.3,1) both" : "none",
            fontSize: 12,
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            display: "grid", placeItems: "center", fontSize: 10,
          }}>{ICON[e.kind] ?? "·"}</div>
          <div style={{
            display: "flex", gap: 6, alignItems: "baseline",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}>
            <span style={{ fontWeight: 500 }}>{e.who}</span>
            <span style={{ opacity: 0.65 }}>{e.what}</span>
            <span style={{ opacity: 0.5 }}>{e.region}</span>
          </div>
          <span style={{ opacity: 0.45, fontVariantNumeric: "tabular-nums", fontSize: 11 }}>{e.t}</span>
        </div>
      ))}
    </div>
  );
}
