"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

const SNAPS = [30, 45, 60, 75, 90, 120];

interface Props {
  initial: number;
}

export function DailyGoalSlider({ initial }: Props) {
  const router = useRouter();
  const [goal, setGoal] = useState<number>(initial);
  const [saving, setSaving] = useState(false);
  const idx = Math.max(0, SNAPS.indexOf(goal));

  // If the server-side initial changes (e.g. after refresh), sync.
  useEffect(() => { setGoal(initial); }, [initial]);

  const select = async (next: number) => {
    if (next === goal) return;
    setGoal(next);
    if (!isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("users").update({ daily_goal_min: next }).eq("id", user.id);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 28 }}>
      <div className="t-micro" style={{ marginBottom: 8 }}>Daily Practice Goal</div>
      <div className="t-stat-md" style={{ marginTop: 8 }}>
        {goal} <span className="t-caption muted" style={{ fontSize: 12 }}>MIN</span>
      </div>

      <div style={{ marginTop: 24, position: "relative" }}>
        <div style={{ position: "relative", height: 32, display: "flex", alignItems: "center" }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "var(--color-track-empty)" }} />
          <div style={{
            position: "absolute",
            left: 0, height: 2,
            width: `${(idx / (SNAPS.length - 1)) * 100}%`,
            background: "var(--color-text-primary)",
            transition: "width 220ms var(--ease-out-expo)",
          }} />
          {SNAPS.map((s, i) => {
            const left = (i / (SNAPS.length - 1)) * 100;
            const isActive = s === goal;
            return (
              <button
                key={s}
                onClick={() => select(s)}
                disabled={saving}
                aria-label={`Set daily goal to ${s} minutes`}
                style={{
                  position: "absolute",
                  left: `calc(${left}% - 12px)`,
                  width: 24, height: 24, borderRadius: 999,
                  background: isActive ? "var(--color-text-primary)" : "var(--color-bg)",
                  border: `0.5px solid ${isActive ? "var(--color-text-primary)" : "var(--color-border)"}`,
                  transform: isActive ? "scale(1)" : "scale(0.55)",
                  transition: "transform 180ms var(--ease-out-expo)",
                  cursor: saving ? "wait" : "pointer",
                  padding: 0,
                }}
              />
            );
          })}
        </div>
        <div className="row-between" style={{ marginTop: 12 }}>
          {SNAPS.map((s) => (
            <button
              key={s}
              onClick={() => select(s)}
              disabled={saving}
              className="t-micro"
              style={{
                width: 24, textAlign: "center",
                color: s === goal ? "var(--color-text-primary)" : "var(--color-text-muted)",
                background: "transparent",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: "var(--color-text-primary)" }} />
        <div className="t-meta">On track this week</div>
      </div>
    </div>
  );
}
