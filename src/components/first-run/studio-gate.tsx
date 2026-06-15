"use client";

// The single client chokepoint for the whole first-run flow. Mounted inside
// the (app) layout, it decides — from local state — what the authenticated
// user actually sees:
//   welcome / onboarding / finale → full-screen takeover (covers sidebar+nav)
//   tutorial                      → real app + ProGate + floating guide
//   done                          → real app + ProGate (Pro screens still gated)
// Until the store hydrates we paint a neutral splash so a `done` user never
// flashes an empty/locked studio.

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFirstRunStore } from "@/lib/first-run/store";
import { Welcome } from "./welcome";
import { OnboardingFlow } from "./onboarding-flow";
import { TutorialGuide } from "./tutorial-guide";
import { ProGate } from "./pro-gate";
import { Culmination } from "./culmination";

function DevResetButton() {
  const reset = useFirstRunStore((s) => s.reset);
  const stage = useFirstRunStore((s) => s.data.stage);
  const router = useRouter();

  const handleReset = () => {
    reset();
    router.push("/home");
  };

  return (
    <button
      onClick={handleReset}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 200,
        background: "rgba(255,59,48,0.9)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        fontFamily: "inherit",
      }}
    >
      DEV · Reset onboarding ({stage})
    </button>
  );
}

export function StudioGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useFirstRunStore((s) => s.hydrated);
  const stage = useFirstRunStore((s) => s.data.stage);

  if (!hydrated) {
    return <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--color-bg)" }} aria-hidden />;
  }

  if (stage === "welcome") {
    return (
      <>
        <Welcome />
        {process.env.NODE_ENV === "development" && <DevResetButton />}
      </>
    );
  }

  if (stage === "onboarding") {
    // completeOnboarding() (called inside the flow) flips stage → tutorial;
    // we just make sure the tutorial begins on Today.
    return (
      <>
        <OnboardingFlow onFinish={() => router.push("/home")} />
        {process.env.NODE_ENV === "development" && <DevResetButton />}
      </>
    );
  }

  if (stage === "finale") {
    return (
      <>
        <ProGate>{children}</ProGate>
        <Culmination />
        {process.env.NODE_ENV === "development" && <DevResetButton />}
      </>
    );
  }

  if (stage === "tutorial") {
    return (
      <>
        <ProGate>{children}</ProGate>
        <TutorialGuide />
        {process.env.NODE_ENV === "development" && <DevResetButton />}
      </>
    );
  }

  // done
  return (
    <>
      <ProGate>{children}</ProGate>
      {process.env.NODE_ENV === "development" && <DevResetButton />}
    </>
  );
}
