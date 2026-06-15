import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatNumber } from "@/components/ui/stat-number";
import { WeekChart } from "@/components/ui/week-chart";
import { AmbientField } from "@/components/home/ambient-field";
import { HomeHero } from "@/components/home/home-hero";
import { HomeRepertoire } from "@/components/home/home-repertoire";
import { SocialFeed } from "@/components/feed/social-feed";
import { Reveal } from "@/components/ui/motion/reveal";
import { ReadinessRing } from "@/components/ui/motion/readiness-ring";
import { getHomePageData } from "@/lib/app-data";
import { demoFixturesEnabled } from "@/lib/env";

export default async function HomePage() {
  const data = await getHomePageData();
  const audition = data.nextAudition;
  const showFixtures = demoFixturesEnabled();
  // Guard divide-by-zero when the daily goal is 0 (NaN / Infinity otherwise).
  const goalPct = data.goalMinutes > 0 ? Math.round((data.todayMinutes / data.goalMinutes) * 100) : 0;
  const goalFrac = data.goalMinutes > 0 ? data.todayMinutes / data.goalMinutes : 0;

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10 lg:!pt-8">
      {/* Mobile-only top bar */}
      <div className="lg:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 12px" }}>
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: -0.2 }}>Andante</span>
        <Link href="/settings" aria-label="Settings"
          style={{ width: 32, height: 32, display: "grid", placeItems: "center", color: "var(--color-text-primary)" }}>
          <Icon name="settings" size={20} />
        </Link>
      </div>

      {/* Hero row */}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)", marginBottom: 20 }} className="lg:!grid-cols-[1.4fr_1fr]">
        <div
          className="card-lg"
          style={{
            background: "var(--color-text-primary)",
            color: "var(--color-bg)",
            borderRadius: 14,
            padding: 28,
            display: "flex", flexDirection: "column",
            minHeight: 240,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <AmbientField count={22} />
          <div style={{
            position: "absolute", top: 24, right: 28,
            width: 8, height: 8, borderRadius: 999,
            background: "var(--color-bg)",
            animation: "breathe 3s ease-in-out infinite",
          }} />
          <HomeHero dateLabel={data.dateLabel} serverActivePiece={data.activePiece} />
        </div>

        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="t-micro">Streak</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <StatNumber value={data.streak} />
              <span className="muted" style={{ fontSize: 14 }}>days</span>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 18,
                  background: i < data.streak ? "var(--color-text-primary)" : "var(--color-track-empty)",
                  opacity: i < data.streak ? 0.4 + (i / Math.max(data.streak, 1)) * 0.6 : 1,
                }} />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="row-between">
              <div className="t-micro">Today</div>
              <div className="t-micro">{goalPct}% of goal</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <StatNumber value={data.todayMinutes} />
              <span className="muted" style={{ fontSize: 14 }}>min · goal {data.goalMinutes}</span>
            </div>
            <ProgressBar value={goalFrac} delay={300} />
          </div>
        </div>
      </div>

      {/* Live cohort feed — fabricated social proof, shown only with fixtures on */}
      {showFixtures && (
      <Reveal delay={120} distance={10}>
        <div style={{
          background: "var(--color-text-primary)", color: "var(--color-bg)",
          borderRadius: 14, padding: "20px 24px", marginBottom: 20,
          position: "relative", overflow: "hidden",
        }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999,
                background: "var(--color-bg)",
                animation: "breathe 1.6s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6 }}>
                Live · Your cohort
              </span>
            </div>
            <span style={{ fontSize: 11, opacity: 0.5, letterSpacing: 1 }}>
              NYSSMA ALL-STATE · 1,284 MUSICIANS
            </span>
          </div>
          <SocialFeed />
        </div>
      </Reveal>
      )}

      {/* Week + Audition */}
      <Reveal delay={200} distance={10}>
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)", marginBottom: 20 }} className="lg:!grid-cols-[1.4fr_1fr]">
          <div className="card" style={{ padding: 24 }}>
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div className="t-section">This Week</div>
              <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6 }}>{data.weekTotal}</span>
                {showFixtures && <span className="muted" style={{ fontSize: 12 }}>+ 1h 04m vs last week</span>}
              </div>
            </div>
            <WeekChart days={data.weekDays} todayIdx={data.todayIdx} startKey={data.weekStartKey} />
          </div>
          {audition ? (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row-between">
                <div className="t-micro">Next Audition</div>
                <div className="t-micro">{audition.daysLeft}d</div>
              </div>
              <div className="row-between" style={{ gap: 16, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.1 }}>{audition.name}</div>
                  <div className="t-meta" style={{ marginTop: 6 }}>{audition.location} · {audition.date}</div>
                </div>
                <ReadinessRing value={audition.progress} size={72} stroke={4} sublabel="ready" />
              </div>
            </div>
          ) : (
            <Link href="/goals" className="card press" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", textDecoration: "none", color: "inherit" }}>
              <div className="t-micro">Next Audition</div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.4, lineHeight: 1.2 }}>Add a deadline</div>
              <div className="t-meta">A real audition date gives the work weight. Set one in Goals →</div>
            </Link>
          )}
        </div>
      </Reveal>

      {/* Active repertoire — reflects locally-added pieces */}
      <HomeRepertoire serverPieces={data.activePieces} />
    </div>
  );
}
