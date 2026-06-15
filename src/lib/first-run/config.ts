// Single source of truth for the first-run flow: which screens exist, their
// tier, the order they unlock in the tutorial, the gifted feature, and the
// onboarding/tutorial step definitions. Imported by the nav, the gate, the
// onboarding flow, the tutorial guide, and the culmination so they can never
// drift apart.

import type { IconName } from "@/components/ui/icon";

export type Tier = "free" | "pro";

export interface ScreenDef {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  tier: Tier;
  /** Order this free screen unlocks during the tutorial. `null` for Pro
   *  features (never auto-unlocked) and always-available utilities. */
  unlockOrder: number | null;
  /** Always reachable regardless of tutorial progress (Settings, Pricing). */
  alwaysAvailable?: boolean;
}

// The studio "grows" in this order during the tutorial.
export const SCREENS: ScreenDef[] = [
  { id: "home",        label: "Today",          icon: "home",     href: "/home",        tier: "free", unlockOrder: 0 },
  { id: "pieces",      label: "Pieces",         icon: "music",    href: "/pieces",      tier: "free", unlockOrder: 1 },
  { id: "log",         label: "Log",            icon: "list",     href: "/log",         tier: "free", unlockOrder: 2 },
  { id: "goals",       label: "Goals",          icon: "target",   href: "/goals",       tier: "free", unlockOrder: 3 },
  { id: "loop",        label: "Loop Trainer",   icon: "timer",    href: "/loop",        tier: "pro",  unlockOrder: null },
  { id: "pathways",    label: "Pathways",       icon: "target",   href: "/pathways",    tier: "pro",  unlockOrder: null },
  { id: "recordings",  label: "Recordings",     icon: "mic",      href: "/recordings",  tier: "pro",  unlockOrder: null },
  { id: "rooms",       label: "Practice Rooms", icon: "users",    href: "/rooms",       tier: "pro",  unlockOrder: null },
  { id: "leaderboard", label: "Leaderboard",    icon: "list",     href: "/leaderboard", tier: "pro",  unlockOrder: null },
  { id: "pricing",     label: "Pricing",        icon: "credit-card", href: "/pricing",  tier: "free", unlockOrder: null, alwaysAvailable: true },
  { id: "settings",    label: "Settings",       icon: "settings", href: "/settings",    tier: "free", unlockOrder: null, alwaysAvailable: true },
];

export const SCREEN_BY_ID: Record<string, ScreenDef> = Object.fromEntries(
  SCREENS.map((s) => [s.id, s]),
);

export const SCREEN_BY_HREF: Record<string, ScreenDef> = Object.fromEntries(
  SCREENS.map((s) => [s.href, s]),
);

/** The one Pro feature gifted on the free path. Sticky daily utility; not the
 *  core audition-prep value, so it whets the appetite for Pro. */
export const GIFTED_FEATURE = "loop";

export const TRIAL_DAYS = 10;

export const PRO_PRICE_MONTHLY = "$12";

// ─── Onboarding question definitions ─────────────────────────────────────────
// Phase A is analytics (collected first); Phase B is habits + goals.

export type QuestionKind = "text" | "single" | "instrument" | "number" | "date" | "piece";
export type OnboardingPhase = "profile" | "habits";

export interface OnboardingQuestion {
  id: string;
  phase: OnboardingPhase;
  kind: QuestionKind;
  title: string;
  subtitle?: string;
  placeholder?: string;
  options?: string[];
  skippable?: boolean;
  /** Where the answer is stored: profile.* or habits.*. */
  field: string;
}

export const INSTRUMENTS = [
  "Violin", "Viola", "Cello", "Bass", "Piano", "Voice", "Flute", "Oboe",
  "Clarinet", "Bassoon", "Trumpet", "Horn", "Trombone", "Other",
];

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  // Phase A — analytics
  { id: "displayName",    phase: "profile", kind: "text",       field: "profile.displayName",    title: "What should we call you?", subtitle: "Just a first name is fine.", placeholder: "Your name" },
  { id: "instrument",     phase: "profile", kind: "instrument", field: "profile.instrument",     title: "What do you play?", subtitle: "Pick your main instrument." },
  { id: "role",           phase: "profile", kind: "single",     field: "profile.role",           title: "Which sounds most like you?", options: ["Student", "Hobbyist", "Pro / aspiring pro", "Teacher"] },
  { id: "level",          phase: "profile", kind: "single",     field: "profile.level",          title: "Where are you at?", options: ["Beginner", "Intermediate", "Advanced", "Conservatory / pre-pro"] },
  { id: "yearsPlaying",   phase: "profile", kind: "single",     field: "profile.yearsPlaying",   title: "How long have you played?", options: ["Under a year", "1–3 years", "3–7 years", "7+ years"] },
  { id: "ageRange",       phase: "profile", kind: "single",     field: "profile.ageRange",       title: "Your age range?", subtitle: "Andante is for ages 13 and up.", options: ["13–17", "18–24", "25–34", "35+"], skippable: true },
  { id: "country",        phase: "profile", kind: "text",       field: "profile.country",        title: "Where are you based?", subtitle: "Country or region.", placeholder: "e.g. United States", skippable: true },
  { id: "hasTeacher",     phase: "profile", kind: "single",     field: "profile.hasTeacher",     title: "Do you study with a teacher right now?", options: ["Yes", "No"] },
  { id: "referralSource", phase: "profile", kind: "single",     field: "profile.referralSource", title: "How did you hear about Andante?", options: ["TikTok", "YouTube", "My teacher", "A friend", "Search", "Other"] },
  // Phase B — habits + goals
  { id: "weeklyFrequency", phase: "habits", kind: "single", field: "habits.weeklyFrequency", title: "How often do you practice now?", options: ["Every day", "Most days", "A few times a week", "Rarely — I want to fix that"] },
  { id: "sessionLength",   phase: "habits", kind: "single", field: "habits.sessionLength",   title: "How long is a typical session?", options: ["Under 20 min", "20–45 min", "45–90 min", "90+ min"] },
  { id: "dailyGoalMin",    phase: "habits", kind: "number", field: "habits.dailyGoalMin",    title: "Set a daily goal.", subtitle: "Minutes per day. You can change it anytime.", placeholder: "60" },
  { id: "primaryGoal",     phase: "habits", kind: "single", field: "habits.primaryGoal",     title: "What are you here to do?", subtitle: "This shapes what we show you first.", options: ["Prep for an audition", "Pass an exam (NYSSMA, ABRSM…)", "Win a competition", "Just improve", "Maintain my level"] },
  { id: "struggle",        phase: "habits", kind: "single", field: "habits.struggle",        title: "What's the hardest part right now?", options: ["Staying consistent", "Staying focused", "Learning repertoire", "Performance nerves", "Technique"] },
  { id: "piece",           phase: "habits", kind: "piece",  field: "habits.pieceName",       title: "What are you working on?", subtitle: "Your first piece. Add more later." },
  { id: "audition",        phase: "habits", kind: "date",   field: "habits.auditionDate",    title: "When's your next audition?", subtitle: "A real deadline gives the work weight.", skippable: true },
];

// ─── Tutorial step definitions ───────────────────────────────────────────────

export interface TutorialStep {
  /** Screen unlocked when this step begins (null = no new unlock). */
  unlock: string | null;
  /** Path the primary action navigates to (null = stay). */
  goto: string | null;
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { unlock: "home",   goto: "/home",    icon: "home",   eyebrow: "Your studio",   title: "This is Today.",            body: "Your home base — streak, today's goal, and where you pick up. Let's give it something to track.", cta: "Add your first piece" },
  { unlock: "pieces", goto: "/pieces",  icon: "music",  eyebrow: "Step 1 of 5",   title: "Add what you're working on.", body: "Free includes one active piece — and we'll find its sheet music for you. This is what every session counts toward.", cta: "Start your first session" },
  { unlock: null,     goto: "/session", icon: "timer",  eyebrow: "Step 2 of 5",   title: "Press start. Even one minute counts.", body: "The timer runs in the background so it won't drift while you play.", cta: "See where it lands" },
  { unlock: "log",    goto: "/log",     icon: "list",   eyebrow: "Step 3 of 5",   title: "Every session lands here.", body: "Your Log builds a weekly chart and a history you can actually look back on.", cta: "Set a daily goal" },
  { unlock: "goals",  goto: "/goals",   icon: "target", eyebrow: "Step 4 of 5",   title: "Set a goal worth chasing.", body: "A daily target keeps the streak alive and turns practice into momentum.", cta: "What's behind the lock?" },
  { unlock: null,     goto: null,       icon: "play",   eyebrow: "Step 5 of 5",   title: "You've got the essentials.", body: "Pathways, the Loop Trainer, Recordings, Practice Rooms and Leaderboards are what serious audition prep is built on.", cta: "See your options" },
];
