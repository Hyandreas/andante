"use client";

// Standalone onboarding route. Hit by genuinely-new real signups (middleware
// sends unonboarded users here). In demo mode this route isn't used — the
// (app) StudioGate renders the same OnboardingFlow as an overlay. Either way
// the shared component is the single source of the onboarding UI + local
// persistence; here we additionally mirror the answers to Supabase.

import { useRouter } from "next/navigation";
import { FirstRunProvider } from "@/components/first-run/first-run-provider";
import { OnboardingFlow } from "@/components/first-run/onboarding-flow";
import { useFirstRunStore } from "@/lib/first-run/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function OnboardingPage() {
  const router = useRouter();

  const finish = async () => {
    if (!isSupabaseConfigured()) {
      router.push("/home");
      return;
    }
    try {
      const { profile, habits } = useFirstRunStore.getState().data;
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date().toISOString();
      await supabase.from("users").update({
        display_name: profile.displayName || null,
        instrument: profile.instrument || null,
        daily_goal_min: habits.dailyGoalMin ?? 90,
        timezone,
        onboarded_at: now,
      }).eq("id", user.id);

      // Persist the complete first-run survey for later analytics. App-functional
      // fields live on `users` (above); this is the full record, including the
      // analytics-only fields (referral source, primary goal, struggle, …) that
      // have no home on `users`.
      await supabase.from("onboarding_responses").upsert({
        user_id: user.id,
        display_name: profile.displayName || null,
        instrument: profile.instrument || null,
        role: profile.role || null,
        level: profile.level || null,
        years_playing: profile.yearsPlaying || null,
        age_range: profile.ageRange || null,
        country: profile.country || null,
        has_teacher: profile.hasTeacher ?? null,
        referral_source: profile.referralSource || null,
        weekly_frequency: habits.weeklyFrequency || null,
        session_length: habits.sessionLength || null,
        daily_goal_min: habits.dailyGoalMin ?? null,
        primary_goal: habits.primaryGoal || null,
        struggle: habits.struggle || null,
        piece_name: habits.pieceName?.trim() || null,
        composer: habits.composer?.trim() || null,
        audition_name: habits.auditionName?.trim() || null,
        audition_date: habits.auditionDate || null,
        timezone,
        completed_at: now,
        updated_at: now,
      });

      if (habits.pieceName?.trim()) {
        await supabase.from("pieces").insert({
          user_id: user.id,
          name: habits.pieceName.trim(),
          composer: habits.composer?.trim() || null,
          progress: 0,
          is_active: true,
        });
      }

      if (habits.auditionDate) {
        await supabase.from("auditions").insert({
          user_id: user.id,
          name: habits.auditionName?.trim() || "My next audition",
          date: habits.auditionDate,
        });
      }
    } catch {
      // Onboarding is local-first; a failed mirror write must not trap the
      // user. The local store already advanced them to the tutorial.
    } finally {
      router.push("/home");
    }
  };

  return (
    <FirstRunProvider>
      <OnboardingFlow onFinish={finish} />
    </FirstRunProvider>
  );
}
