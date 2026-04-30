import Link from "next/link";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Icon } from "@/components/ui/icon";
import { STUDENTS } from "@/lib/sample-data";

export default function TeacherPage() {
  const totalHrs = STUDENTS.reduce((s, x) => s + x.weekHours, 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DesktopSidebar />
      <main style={{ flex: 1, paddingBottom: "calc(58px + env(safe-area-inset-bottom, 0))" }} className="lg:!pb-0">
        <div style={{ padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
          <div className="row-between" style={{ marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="t-section" style={{ fontSize: 24 }}>Studio</div>
              <div className="t-meta" style={{ marginTop: 4 }}>
                {STUDENTS.length} students · {totalHrs.toFixed(1)}h logged this week
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/digest-preview" className="press" style={{
                padding: "10px 16px", borderRadius: 10,
                border: "0.5px solid var(--color-border)", fontSize: 13,
                textDecoration: "none", color: "inherit",
              }}>Preview parent digest →</Link>
              <button className="press" style={{
                padding: "10px 18px", borderRadius: 10,
                background: "var(--color-text-primary)", color: "var(--color-bg)",
                fontSize: 13, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                <Icon name="user-plus" size={14} /> Invite student
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0,1fr)" }} className="md:!grid-cols-2 lg:!grid-cols-3">
            {STUDENTS.map((s, i) => {
              const trendMax = Math.max(...s.trend, 1);
              const inactive = s.weekHours === 0;
              return (
                <div
                  key={s.name}
                  className="card press reveal-up"
                  style={{
                    padding: 22,
                    animationDelay: `${i * 60}ms`,
                    border: inactive ? "0.5px solid var(--color-text-primary)" : "0.5px solid transparent",
                  }}
                >
                  <div className="row-between" style={{ marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{s.name}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{s.instrument}</div>
                    </div>
                    {inactive
                      ? <div className="t-micro" style={{ color: "var(--color-text-primary)" }}>⚑ 0 days</div>
                      : <div className="t-micro">{s.streak}d streak</div>}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                    <span className="tabular" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.6 }}>
                      {s.weekHours}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>hrs this week</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 36, marginBottom: 14 }}>
                    {s.trend.map((v, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1, height: `${(v / trendMax) * 100}%`,
                          background: j === s.trend.length - 1 ? "var(--color-text-primary)" : "var(--color-bar-past)",
                        }}
                      />
                    ))}
                  </div>

                  <div className="row-between" style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border)" }}>
                    <span className="t-micro">Audition in {s.daysToAudition}d</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.pieces.length} pieces →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <MobileNav role="teacher" />
    </div>
  );
}
