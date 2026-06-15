"use client";

// Zustand store for the first-run flow. State of record is localStorage; every
// mutation persists synchronously so a refresh mid-flow resumes exactly where
// the user left off. Hydration happens once, client-side, from the provider.

import { create } from "zustand";
import { track } from "./analytics";
import { GIFTED_FEATURE, TRIAL_DAYS } from "./config";
import {
  createInitialState,
  type FirstRunHabits,
  type FirstRunProfile,
  type FirstRunState,
  type Stage,
} from "./types";

const STORE_KEY = "andante.firstrun.v1";

function persist(data: FirstRunState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function load(): FirstRunState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirstRunState;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface FirstRunStore {
  hydrated: boolean;
  data: FirstRunState;

  hydrate: () => void;
  commit: (patch: Partial<FirstRunState>) => void;

  setProfile: (patch: Partial<FirstRunProfile>) => void;
  setHabits: (patch: Partial<FirstRunHabits>) => void;
  goToStage: (stage: Stage) => void;
  completeOnboarding: () => void;
  unlockScreen: (id: string) => void;
  advanceTutorial: (to: number) => void;
  openFinale: () => void;
  startTrial: () => void;
  dismissPaid: () => void;
  chooseFree: () => void;
  claimGift: (id: string) => void;
  complete: () => void;
  reset: () => void;
}

export const useFirstRunStore = create<FirstRunStore>((set, get) => {
  const write = (patch: Partial<FirstRunState>) => {
    const next = { ...get().data, ...patch };
    persist(next);
    set({ data: next });
    return next;
  };

  return {
    hydrated: false,
    data: createInitialState(),

    hydrate: () => {
      if (get().hydrated) return;
      const existing = load();
      if (existing) {
        set({ data: existing, hydrated: true });
      } else {
        const fresh = createInitialState();
        persist(fresh);
        set({ data: fresh, hydrated: true });
        track("first_run_started");
      }
    },

    commit: write,

    setProfile: (patch) => {
      write({ profile: { ...get().data.profile, ...patch } });
    },

    setHabits: (patch) => {
      write({ habits: { ...get().data.habits, ...patch } });
    },

    goToStage: (stage) => {
      write({ stage });
    },

    completeOnboarding: () => {
      const { profile, habits } = get().data;
      track("onboarding_completed", { profile, habits });
      write({ stage: "tutorial", tutorial: { step: 0, unlocked: ["home"] } });
      track("tutorial_started");
    },

    unlockScreen: (id) => {
      const { unlocked, step } = get().data.tutorial;
      if (unlocked.includes(id)) return;
      write({ tutorial: { step, unlocked: [...unlocked, id] } });
      track("screen_unlocked", { id });
    },

    advanceTutorial: (to) => {
      const { unlocked } = get().data.tutorial;
      write({ tutorial: { step: to, unlocked } });
      track("tutorial_step_completed", { step: to });
    },

    openFinale: () => {
      track("tutorial_completed");
      write({ stage: "finale" });
      track("paywall_viewed");
    },

    startTrial: () => {
      track("trial_started");
      write({
        plan: "trial",
        trialEndsAt: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
        stage: "done",
        completedAt: Date.now(),
      });
      track("first_run_completed", { outcome: "trial" });
    },

    dismissPaid: () => {
      track("paid_dismissed");
    },

    chooseFree: () => {
      track("free_chosen");
    },

    claimGift: (id) => {
      track("gift_claimed", { id });
      write({
        giftedFeature: id,
        plan: "free",
        stage: "done",
        completedAt: Date.now(),
      });
      track("first_run_completed", { outcome: "free", gift: id });
    },

    complete: () => {
      write({ stage: "done", completedAt: Date.now() });
    },

    reset: () => {
      const fresh = createInitialState();
      persist(fresh);
      set({ data: fresh });
      track("first_run_reset");
    },
  };
});

export { GIFTED_FEATURE };
