"use client";

// Stage 3 driver: a calm floating guide that grows the studio. Each primary
// press unlocks the next free screen and navigates there; the final step opens
// the culmination. Deterministic and always advanceable — no dead ends, and it
// never unlocks a Pro feature.

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { TUTORIAL_STEPS } from "@/lib/first-run/config";
import { useFirstRunStore } from "@/lib/first-run/store";

export function TutorialGuide() {
  const router = useRouter();
  const step = useFirstRunStore((s) => s.data.tutorial.step);
  const pieceName = useFirstRunStore((s) => s.data.habits.pieceName);
  const unlockScreen = useFirstRunStore((s) => s.unlockScreen);
  const advanceTutorial = useFirstRunStore((s) => s.advanceTutorial);
  const openFinale = useFirstRunStore((s) => s.openFinale);

  const hasPiece = Boolean(pieceName?.trim());
  let current = TUTORIAL_STEPS[step];
  // When the user added a piece during onboarding, the "add a piece" framing is stale.
  if (hasPiece && step === 0) current = { ...current, cta: "See your piece" };
  if (hasPiece && step === 1) current = { ...current, title: "Your piece is ready." };
  if (!current) return null;
  const total = TUTORIAL_STEPS.length;
  const isLast = step === total - 1;
  const progress = (step + 1) / total;

  const onPrimary = () => {
    if (isLast) {
      openFinale();
      return;
    }
    const next = step + 1;
    const ns = TUTORIAL_STEPS[next];
    if (ns.unlock) unlockScreen(ns.unlock);
    advanceTutorial(next);
    if (ns.goto) router.push(ns.goto);
  };

  return (
    <div
      className="lg:!bottom-6"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        margin: "0 auto",
        width: "calc(100% - 32px)",
        maxWidth: 460,
        zIndex: 40,
        background: "var(--color-text-primary)",
        color: "var(--color-bg)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 22px 60px rgba(0,0,0,0.32)",
        animation: "revealUp 440ms var(--ease-out-expo) both",
      }}
    >
      {/* Top progress hairline */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.14)" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--color-bg)", borderRadius: "0 999px 999px 0", transition: "width 360ms var(--ease-out-expo)" }} />
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {/* Step icon badge */}
          <div
            key={step}
            style={{
              flexShrink: 0,
              width: 42, height: 42, borderRadius: 12,
              display: "grid", placeItems: "center",
              background: "rgba(255,255,255,0.12)",
              color: "var(--color-bg)",
              animation: "revealUp 360ms var(--ease-out-expo) both",
            }}
          >
            <Icon name={current.icon} size={20} stroke={1.5} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55 }}>{current.eyebrow}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.2 }}>{current.title}</div>
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, marginTop: 12 }}>{current.body}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button
            onClick={onPrimary}
            className="press"
            style={{
              flex: 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "var(--color-bg)",
              color: "var(--color-text-primary)",
              borderRadius: 11,
              padding: "13px 18px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {current.cta}
            <Icon name="chevron-right" size={16} stroke={2} />
          </button>
          {!isLast && (
            <button
              onClick={openFinale}
              className="press"
              style={{ fontSize: 12, color: "var(--color-bg)", opacity: 0.55, background: "transparent", whiteSpace: "nowrap", padding: "0 4px" }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
