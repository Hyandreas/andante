// Pure entitlement + nav-state logic. No React, no side effects — so it stays
// trivially correct and reusable across the sidebar, mobile nav, and gate.

import { SCREEN_BY_ID, SCREEN_BY_HREF, type ScreenDef } from "./config";
import type { FirstRunState } from "./types";

export type NavItemState = "available" | "locked-pro" | "hidden";

/** Is the user entitled to use this feature (vs. just see it locked)? */
export function isFeatureUnlocked(state: FirstRunState, screenId: string): boolean {
  const screen = SCREEN_BY_ID[screenId];
  if (!screen) return true;
  if (screen.tier === "free") return true;
  // Pro feature:
  if (state.plan === "trial" || state.plan === "pro") return true;
  return state.giftedFeature === screenId;
}

/** True once the trial window has lapsed (no real billing in demo — this just
 *  reflects the local clock). */
export function isTrialExpired(state: FirstRunState): boolean {
  return state.plan === "trial" && state.trialEndsAt != null && Date.now() > state.trialEndsAt;
}

/** How a nav item should render given current stage + entitlement. */
export function navItemState(state: FirstRunState, screen: ScreenDef): NavItemState {
  if (screen.alwaysAvailable) return "available";

  if (screen.tier === "pro") {
    if (isFeatureUnlocked(state, screen.id)) return "available";
    // Visible-but-locked only once first-run is done. During the tutorial the
    // studio stays minimal — Pro features are revealed at the culmination, not
    // dangled locked from step one.
    return state.stage === "done" ? "locked-pro" : "hidden";
  }

  // Free feature. During the tutorial the studio "grows": hide free screens
  // that haven't been unlocked yet. Once done, all free screens are available.
  if (state.stage === "done") return "available";
  if (state.stage === "tutorial") {
    return state.tutorial.unlocked.includes(screen.id) ? "available" : "hidden";
  }
  // welcome / onboarding / finale — the studio isn't reachable anyway.
  return "hidden";
}

/** Resolve a route to its screen def (for the ProGate overlay). */
export function screenForPath(pathname: string): ScreenDef | undefined {
  if (SCREEN_BY_HREF[pathname]) return SCREEN_BY_HREF[pathname];
  // Match nested routes like /rooms/[id].
  return Object.values(SCREEN_BY_ID).find(
    (s) => s.href !== "/" && pathname.startsWith(s.href + "/"),
  );
}
