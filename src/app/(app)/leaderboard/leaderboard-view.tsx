"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COHORTS, LEADERS } from "@/lib/sample-data";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { demoFixturesEnabled } from "@/lib/env";
import { initials } from "@/lib/utils";

// Leaderboard requires fabricated cohort data, which only ships with demo
// fixtures. Real/empty users get a "coming soon" state.
const SHOW_FIXTURES = demoFixturesEnabled();

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20, width: 56 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? "var(--color-text-primary)" : "var(--color-bar-past)",
          }}
        />
      ))}
    </div>
  );
}

const RANGES = [
  { id: "week", label: "week", multiplier: 1 },
  { id: "month", label: "month", multiplier: 4.2 },
  { id: "all-time", label: "all-time", multiplier: 38 },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

export function LeaderboardView() {
  const [range, setRange] = useState<RangeId>("week");
  const [cohortIdx, setCohortIdx] = useState(0);
  // Optimistic, local-only kudos increments keyed by rank. No backend in demo,
  // so we just bump the displayed count and disable a second tap.
  const [kudosGiven, setKudosGiven] = useState<Record<number, boolean>>({});

  const multiplier = RANGES.find((r) => r.id === range)!.multiplier;
  const rangeLabel = range === "all-time" ? "all time" : `this ${range}`;

  // Scale every correlated field by the same range multiplier so the table,
  // podium, and summary stats stay internally consistent.
  const leaders = useMemo(() => {
    return LEADERS.map((p) => ({
      ...p,
      weekHours: Math.round(p.weekHours * multiplier * 10) / 10,
    }));
  }, [multiplier]);

  // Everything below is DERIVED from the displayed dataset rather than hardcoded
  // so the four summary stats react to range (and would react to cohort once
  // cohort-specific data exists).
  const stats = useMemo(() => {
    type Row = (typeof leaders)[number];
    const you = leaders.find((p) => p.you);
    const sorted = [...leaders].sort((a, b) => b.weekHours - a.weekHours);
    // Cohort population is not yet range/cohort-specific in the fixtures, so use
    // a stable figure that matches the "1,284 musicians" copy elsewhere.
    const total = 1284;
    if (!you) {
      return { rank: null as number | null, percentile: null as number | null, behindLeader: 0, nextUp: null as Row | null, gapToNext: 0 };
    }
    const rank = you.rank;
    const leader = sorted[0];
    const behindLeader = Math.max(0, Math.round((leader.weekHours - you.weekHours) * 10) / 10);
    // The displayed person directly ahead of "you" by hours.
    const ahead = sorted.filter((p) => !p.you && p.weekHours >= you.weekHours);
    const nextUp = ahead.length > 0 ? ahead[ahead.length - 1] : null;
    const gapToNext = nextUp ? Math.max(0, Math.round((nextUp.weekHours - you.weekHours) * 10) / 10) : 0;
    const percentile = Math.max(1, Math.round((rank / total) * 100));
    return { rank, percentile, behindLeader, nextUp, gapToNext };
  }, [leaders]);

  // Forward estimate to pass the next person up, derived from the real gap and
  // your displayed weekly pace (so it scales with range instead of reading a
  // fixed "Thursday").
  const youPaceHrsPerDay = (leaders.find((p) => p.you)?.weekHours ?? 11.4) / 7;
  const overtakeGapHours = stats.gapToNext;
  const overtakeDays = overtakeGapHours <= 0 ? 1 : Math.max(1, Math.ceil(overtakeGapHours / Math.max(0.1, youPaceHrsPerDay)));
  const paceLabel =
    overtakeGapHours <= 0 ? "you're ahead"
      : overtakeDays <= 1 ? "by tomorrow"
        : overtakeDays <= 10 ? `in ${overtakeDays} days`
          : overtakeDays <= 70 ? `in ~${Math.round(overtakeDays / 7)} weeks`
            : `in ~${Math.round(overtakeDays / 30)} months`;
  const nextUpName = stats.nextUp?.name ?? "the next rank";
  const nextUpRank = stats.nextUp?.rank;

  const kudosCount = (rank: number, base: number) => base + (kudosGiven[rank] ? 1 : 0);
  const giveKudos = (rank: number) => setKudosGiven((prev) => (prev[rank] ? prev : { ...prev, [rank]: true }));

  if (!SHOW_FIXTURES) {
    return (
      <div style={{ flex: 1, display: "flex" }}>
        <EmptyState
          title="Leaderboard coming soon"
          body="Once you and your cohort start logging practice, you'll see rankings, streaks, and kudos here."
          icon={<Icon name="users" size={18} />}
          fill
          action={
            <Link href="/session" className="press" style={{
              padding: "12px 22px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
            }}>
              Start practicing
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 6, alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="t-section" style={{ fontSize: 24 }}>Leaderboard</div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            Hours practiced & streak among {COHORTS[cohortIdx].label}. Anonymized below #20.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setRange(s.id)}
              className={`chip press ${range === s.id ? "active" : ""}`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      <div className="chip-row no-scrollbar" style={{ margin: "20px 0 24px", overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}>
        {COHORTS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setCohortIdx(i)}
            className={`chip press ${cohortIdx === i ? "active" : ""}`}
          >{c.label}</button>
        ))}
      </div>

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        padding: "16px 0", marginBottom: 24,
        borderTop: "0.5px solid var(--color-border)",
        borderBottom: "0.5px solid var(--color-border)",
      }} className="lg:!grid-cols-4">
        {[
          ["Your rank", stats.rank != null ? `#${stats.rank}` : "—", rangeLabel],
          ["Cohort percentile", stats.percentile != null ? `top ${stats.percentile}%` : "—", "of 1,284"],
          ["Hours behind #1", `${stats.behindLeader.toFixed(1)}h`, rangeLabel],
          [nextUpRank != null ? `Pace to overtake #${nextUpRank}` : "Pace", paceLabel, "at current rate"],
        ].map(([l, n, sub]) => (
          <div key={l}>
            <div className="t-micro">{l}</div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{n}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Top-3 podium */}
      <div style={{
        display: "grid",
        gap: 12, marginBottom: 28, alignItems: "end",
        gridTemplateColumns: "1fr 1.2fr 1fr",
      }}>
        {[leaders[1], leaders[0], leaders[2]].map((p, i) => {
          const isCenter = i === 1;
          return (
            <div
              key={p.rank}
              className="card reveal-up"
              style={{
                padding: 20, paddingBottom: isCenter ? 28 : 20,
                display: "flex", flexDirection: "column", gap: 10,
                transform: `scale(${isCenter ? 1.02 : 1})`,
                background: isCenter ? "var(--color-text-primary)" : "var(--color-card-fill)",
                color: isCenter ? "var(--color-bg)" : "var(--color-text-primary)",
                minHeight: 220,
                animationDelay: `${i * 90}ms`,
              }}
            >
              <div className="row-between">
                <span style={{ fontSize: 10, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>#{p.rank}</span>
                <span style={{ fontSize: 14 }}>{p.region}</span>
              </div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.2 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{p.instrument}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 500, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>
                  {p.weekHours}
                </span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>hrs</span>
              </div>
              <div className="row-between" style={{ fontSize: 11, opacity: 0.7 }}>
                <span>{p.streak}d streak</span>
                <span>♥ {kudosCount(p.rank, p.kudos)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranked table */}
      <div className="hidden md:!grid" style={{
        gridTemplateColumns: "60px 1fr 100px 1fr 80px 100px 90px",
        padding: "10px 0", borderBottom: "0.5px solid var(--color-border)",
      }}>
        {["Rank", "Musician", "Region", "", "Streak", "Hours", ""].map((h, i) => (
          <div key={i} className="t-micro">{h}</div>
        ))}
      </div>
      {leaders.map((p) => (
        <div
          key={p.rank}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            padding: "14px 0", borderBottom: "0.5px solid var(--color-border)",
            alignItems: "center",
            background: p.you ? "var(--color-card-fill)" : "transparent",
            marginLeft: p.you ? -16 : 0, marginRight: p.you ? -16 : 0,
            paddingLeft: p.you ? 16 : 0, paddingRight: p.you ? 16 : 0,
          }}
          className="md:!grid-cols-[60px_1fr_100px_1fr_80px_100px_90px]"
        >
          <div className="md:!hidden" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: p.you ? 500 : 400, fontVariantNumeric: "tabular-nums", color: "var(--color-text-secondary)" }}>
              #{p.rank}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: p.you ? "var(--color-text-primary)" : "var(--color-card-fill)",
              color: p.you ? "var(--color-bg)" : "var(--color-text-primary)",
              display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 500,
              border: "0.5px solid var(--color-border)",
              flexShrink: 0,
            }}>{initials(p.name)}</div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: p.you ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div className="t-meta">{p.instrument} · {p.streak}d</div>
            </div>
          </div>

          <div className="hidden md:!block" style={{ fontSize: 15, fontWeight: p.you ? 500 : 400, fontVariantNumeric: "tabular-nums" }}>
            #{p.rank}
          </div>
          <div className="hidden md:!flex" style={{ alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: p.you ? "var(--color-text-primary)" : "var(--color-card-fill)",
              color: p.you ? "var(--color-bg)" : "var(--color-text-primary)",
              display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 500,
              border: "0.5px solid var(--color-border)",
            }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: p.you ? 500 : 400 }}>{p.name}</div>
              <div className="t-meta">{p.instrument}</div>
            </div>
          </div>
          <div className="hidden md:!block" style={{ fontSize: 14 }}>{p.region}</div>
          <div className="hidden md:!block"><Spark data={p.trend} /></div>
          <div className="hidden md:!block" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{p.streak}d</div>
          <div className="hidden md:!block" style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: -0.3 }}>
            {p.weekHours}h
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
            <span className="md:!hidden tabular" style={{ fontSize: 14, fontWeight: 500 }}>{p.weekHours}h</span>
            {p.you ? (
              <span className="t-micro">YOU</span>
            ) : (
              <button
                className="press"
                onClick={() => giveKudos(p.rank)}
                disabled={!!kudosGiven[p.rank]}
                aria-label={`Give kudos to ${p.name}`}
                style={{
                  fontSize: 12, padding: "5px 10px",
                  border: "0.5px solid var(--color-border)", borderRadius: 6,
                  color: kudosGiven[p.rank] ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}
              >♥ {kudosCount(p.rank, p.kudos)}</button>
            )}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 24, padding: "16px 20px",
        background: "var(--color-text-primary)", color: "var(--color-bg)",
        borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {overtakeGapHours > 0
              ? `${overtakeGapHours.toFixed(1)}h to overtake ${nextUpRank != null ? `#${nextUpRank} ` : ""}(${nextUpName})`
              : "You're at the top of the visible table"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            {overtakeGapHours > 0
              ? `At your current pace, you'd pass them ${paceLabel}.`
              : "Keep logging to defend your spot."}
          </div>
        </div>
        <Link
          href="/session"
          className="press"
          style={{
            background: "var(--color-bg)", color: "var(--color-text-primary)",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            textDecoration: "none",
          }}
        >Plan today&apos;s session</Link>
      </div>
    </div>
  );
}
