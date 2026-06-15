import { AddAuditionButton } from "@/components/goals/add-audition-button";
import { AuditionCards } from "@/components/goals/audition-cards";
import { DailyGoalSlider } from "@/components/goals/daily-goal-slider";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
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

      {data.auditions.length === 0 ? (
        <EmptyState
          title="No auditions yet"
          body="Add an audition or exam date and Andante counts down the weeks — and tracks how ready you are."
          icon={<Icon name="calendar" size={18} />}
          action={<AddAuditionButton />}
        />
      ) : (
        <>
          <div className="t-micro" style={{ marginBottom: 12 }}>Upcoming Auditions</div>
          <AuditionCards auditions={data.auditions} />
        </>
      )}
    </div>
  );
}
