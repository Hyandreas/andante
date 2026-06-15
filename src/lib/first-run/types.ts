// Persisted shape of the first-run flow. State of record lives in
// localStorage under "andante.firstrun.v1"; a user with no key is first-run.

export type Stage = "welcome" | "onboarding" | "tutorial" | "finale" | "done";
export type Plan = "free" | "trial" | "pro";

export interface FirstRunProfile {
  displayName?: string;
  instrument?: string;
  role?: string;
  level?: string;
  yearsPlaying?: string;
  ageRange?: string;
  country?: string;
  referralSource?: string;
  hasTeacher?: boolean;
}

export interface FirstRunHabits {
  weeklyFrequency?: string;
  sessionLength?: string;
  dailyGoalMin?: number;
  primaryGoal?: string;
  struggle?: string;
  pieceName?: string;
  composer?: string;
  auditionName?: string;
  auditionDate?: string;
}

export interface FirstRunState {
  version: 1;
  stage: Stage;
  profile: FirstRunProfile;
  habits: FirstRunHabits;
  tutorial: { step: number; unlocked: string[] };
  plan: Plan;
  trialEndsAt: number | null;
  giftedFeature: string | null;
  startedAt: number;
  completedAt: number | null;
}

export function createInitialState(): FirstRunState {
  return {
    version: 1,
    stage: "welcome",
    profile: {},
    habits: {},
    tutorial: { step: 0, unlocked: [] },
    plan: "free",
    trialEndsAt: null,
    giftedFeature: null,
    startedAt: Date.now(),
    completedAt: null,
  };
}
