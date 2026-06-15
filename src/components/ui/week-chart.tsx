"use client";

interface WeekChartProps {
  days: (number | null)[]; // 7 entries, Monday-anchored; null = future
  todayIdx: number;
  /** ISO date (YYYY-MM-DD) of the Monday that anchors the window. When given,
   *  labels are derived from the real dates so bars and labels stay aligned. */
  startKey?: string;
  /** Explicit single-letter labels override; takes precedence over startKey. */
  labels?: string[];
  reKey?: number;
}

const DEFAULT_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Derive 7 single-letter weekday labels from a Monday-anchored start date.
function labelsFromStartKey(startKey: string): string[] {
  // Parse as local midnight to avoid TZ shifting the day.
  const [y, m, d] = startKey.split("-").map(Number);
  if (!y || !m || !d) return DEFAULT_LABELS;
  const start = new Date(y, m - 1, d);
  const letter = ["S", "M", "T", "W", "T", "F", "S"]; // index by getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start.getTime() + i * 86400000);
    return letter[day.getDay()];
  });
}

export function WeekChart({ days, todayIdx, startKey, labels, reKey = 0 }: WeekChartProps) {
  const dayLabels = labels ?? (startKey ? labelsFromStartKey(startKey) : DEFAULT_LABELS);
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
              {dayLabels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
