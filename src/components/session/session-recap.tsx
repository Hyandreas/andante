"use client";

import { AnimatedNumber } from "@/components/ui/motion/animated-number";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/motion/reveal";

interface SessionRecapProps {
  minutes: number;
  goalMinutes?: number;
  streakAfter?: number;
  pieceName?: string;
  /** Optional list of segments (e.g. mm. 41–58 · 18m). */
  segments?: Array<{ label: string; minutes: number }>;
  onClose?: () => void;
  onShare?: () => void;
}

/**
 * End-of-session recap card. Drop this in when a session ends — animated
 * count-ups give the moment weight without being noisy. Use inside a
 * full-screen overlay or as a standalone card on the session route.
 */
export function SessionRecap({
  minutes,
  goalMinutes,
  streakAfter,
  pieceName,
  segments,
  onClose,
  onShare,
}: SessionRecapProps) {
  const pctOfGoal = goalMinutes && goalMinutes > 0 ? Math.min(1, minutes / goalMinutes) : null;

  return (
    <div
      role="dialog"
      aria-label="Session recap"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 32,
        background: "var(--color-card-fill)",
        borderRadius: 14,
        maxWidth: 480,
        width: "100%",
      }}
    >
      <Reveal duration={520} distance={8}>
        <div className="t-micro">Session complete</div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: -1.2,
            lineHeight: 1.05,
            marginTop: 8,
          }}
        >
          You practiced{" "}
          <AnimatedNumber value={minutes} duration={1100} />{" "}
          <span style={{ color: "var(--color-text-secondary)" }}>min</span>
        </div>
        {pieceName && (
          <div className="t-meta" style={{ marginTop: 6 }}>
            on <span style={{ color: "var(--color-text-primary)" }}>{pieceName}</span>
          </div>
        )}
      </Reveal>

      {pctOfGoal != null && (
        <Reveal delay={120} duration={520} distance={8}>
          <div>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="t-micro">Toward today’s goal</span>
              <span className="t-micro tabular">
                <AnimatedNumber value={Math.round(pctOfGoal * 100)} duration={1100} suffix="%" />
              </span>
            </div>
            <ProgressBar value={pctOfGoal} delay={500} />
          </div>
        </Reveal>
      )}

      {segments && segments.length > 0 && (
        <Reveal delay={220} duration={520} distance={8}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="t-micro">Segments</div>
            {segments.map((s, i) => (
              <div key={i} className="row-between" style={{ padding: "6px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                <span style={{ fontSize: 13 }}>{s.label}</span>
                <span className="tabular" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {s.minutes}m
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {streakAfter != null && (
        <Reveal delay={320} duration={520} distance={8}>
          <div
            className="row-between"
            style={{
              padding: "16px 18px",
              background: "var(--color-bg)",
              borderRadius: 10,
              border: "0.5px solid var(--color-border)",
            }}
          >
            <span style={{ fontSize: 14 }}>Streak</span>
            <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.4 }}>
              <AnimatedNumber value={streakAfter} duration={1100} /> days
            </span>
          </div>
        </Reveal>
      )}

      <Reveal delay={420} duration={520} distance={8}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onShare && (
            <button
              onClick={onShare}
              className="press"
              style={{
                padding: "12px 22px",
                borderRadius: 10,
                background: "var(--color-text-primary)",
                color: "var(--color-bg)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Share with teacher
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="press"
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "0.5px solid var(--color-border)",
                fontSize: 14,
              }}
            >
              Done
            </button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
