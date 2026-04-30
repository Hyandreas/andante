import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AddAuditionButton } from "@/components/goals/add-audition-button";
import { DailyGoalSlider } from "@/components/goals/daily-goal-slider";
import { getGoalsPageData } from "@/lib/app-data";

export default async function GoalsPage() {
  const data = await getGoalsPageData();

  return (
    <div style={{ flex: 1, padding: "32px 24px 48px", overflowY: "auto" }} className="lg:!px-10">
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="t-section" style={{ fontSize: 24 }}>Goals</div>
        <AddAuditionButton />
      </div>

      <DailyGoalSlider initial={data.goalMin} />

      <div className="t-micro" style={{ marginBottom: 12 }}>Upcoming Auditions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.auditions.map((a, i) => (
          <div key={i} className="card card-lg reveal-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="t-card-label">{a.name}</div>
                <div className="t-meta" style={{ marginTop: 4 }}>{a.location} · {a.date}</div>
              </div>
              <div className="muted"><Icon name="calendar" size={20} stroke={1.25} /></div>
            </div>
            <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 20 }}>
              <div className="t-stat-md">{a.daysLeft}</div>
              <div className="t-caption muted">DAYS</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <ProgressBar value={a.progress} delay={i * 60} />
            </div>
            <div className="row-between" style={{ marginTop: 8 }}>
              <div className="t-micro">Prep elapsed</div>
              <div className="t-micro">{Math.round(a.progress * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
