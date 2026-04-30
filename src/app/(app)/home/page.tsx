import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatNumber } from "@/components/ui/stat-number";
import { WeekChart } from "@/components/ui/week-chart";
import { AmbientField } from "@/components/home/ambient-field";
import { SocialFeed } from "@/components/feed/social-feed";
import { getHomePageData } from "@/lib/app-data";

export default async function HomePage() {
  const data = await getHomePageData();
  const audition = data.nextAudition;

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
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.55 }}>
            {data.dateLabel}
          </div>
          <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.4, marginTop: 8, lineHeight: 1.1 }}>
            Pick up where<br />you left off.
          </div>
          <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="t-micro" style={{ opacity: 0.6 }}>Active piece</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{data.activePiece.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>Mvt. III · mm. 41–58</div>
            </div>
            <Link
              href="/session"
              className="press"
              style={{
                background: "var(--color-bg)",
                color: "var(--color-text-primary)",
                padding: "14px 24px",
                borderRadius: 10,
                fontSize: 14, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 10,
                textDecoration: "none",
              }}
            >
              Start Practice
              <Kbd>S</Kbd>
            </Link>
          </div>
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
              <div className="t-micro">{Math.round((data.todayMinutes / data.goalMinutes) * 100)}% of goal</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <StatNumber value={data.todayMinutes} />
              <span className="muted" style={{ fontSize: 14 }}>min · goal {data.goalMinutes}</span>
            </div>
            <ProgressBar value={data.todayMinutes / data.goalMinutes} delay={300} />
          </div>
        </div>
      </div>

      {/* Live cohort feed */}
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

      {/* Week + Audition */}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(0,1fr)", marginBottom: 20 }} className="lg:!grid-cols-[1.4fr_1fr]">
        <div className="card" style={{ padding: 24 }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div className="t-section">This Week</div>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6 }}>{data.weekTotal}</span>
              <span className="muted" style={{ fontSize: 12 }}>+ 1h 04m vs last week</span>
            </div>
          </div>
          <WeekChart days={data.weekDays} todayIdx={data.todayIdx} />
        </div>
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row-between">
            <div className="t-micro">Next Audition</div>
            <div className="t-micro">{audition.daysLeft}d</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.1 }}>{audition.name}</div>
            <div className="t-meta" style={{ marginTop: 6 }}>{audition.location} · {audition.date}</div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="t-micro">Readiness</span>
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(audition.progress * 100)}%</span>
            </div>
            <ProgressBar value={audition.progress} delay={400} />
          </div>
        </div>
      </div>

      {/* Active repertoire */}
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="t-section">Active Repertoire</div>
        <div className="t-micro">{data.activePieces.length} pieces</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }} className="lg:!grid-cols-2">
        {data.activePieces.slice(0, 4).map((p, i) => (
          <Link
            key={p.id}
            href={`/pieces#${p.id}`}
            className="card press reveal-up"
            style={{
              padding: 20,
              display: "flex", flexDirection: "column", gap: 14,
              animationDelay: `${i * 70}ms`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div className="row-between">
              <div className="t-micro">{p.role}</div>
              <div className="t-micro">{p.totalSessions} sessions</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: -0.2, lineHeight: 1.2 }}>{p.name}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}</div>
            </div>
            <div>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span className="t-micro">{p.weekTime}</span>
                <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(p.progress * 100)}%</span>
              </div>
              <ProgressBar value={p.progress} delay={i * 70 + 300} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
