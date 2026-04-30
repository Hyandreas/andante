"use client";

interface WeekChartProps {
  days: (number | null)[]; // 7 entries Mon..Sun; null = future
  todayIdx: number;
  reKey?: number;
}

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function WeekChart({ days, todayIdx, reKey = 0 }: WeekChartProps) {
  const max = Math.max(...days.filter((v): v is number => v != null), 1);
  return (
    <div
      key={reKey}
      style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 120, gap: 8 }}
    >
      {days.map((d, i) => {
        const isFuture = d == null;
        const isToday = i === todayIdx;
        const heightPct = isFuture ? 0.16 : (d! / max) * 0.8;
        const color = isFuture
          ? "var(--color-bar-future)"
          : isToday
            ? "var(--color-text-primary)"
            : "var(--color-bar-past)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
              <div
                className="bar-grow"
                style={{
                  width: "100%",
                  maxWidth: 28,
                  height: `${Math.max(heightPct * 100, isFuture ? 8 : 4)}%`,
                  background: color,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            </div>
            <div className="t-micro" style={{ color: isToday ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
              {LABELS[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
