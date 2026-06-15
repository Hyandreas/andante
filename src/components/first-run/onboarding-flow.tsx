"use client";

// Stage 2: the expanded onboarding stepper. Phase A (profile) is analytics —
// collected first; Phase B (habits) shapes the tutorial framing. All answers
// persist to the local store as the user advances, so a refresh resumes
// mid-flow. Reused both as a full-screen takeover (inside the gate) and at the
// /onboarding route (genuinely-new real signups).

import { useMemo, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import {
  INSTRUMENTS,
  ONBOARDING_QUESTIONS,
  type OnboardingQuestion,
} from "@/lib/first-run/config";
import { track } from "@/lib/first-run/analytics";
import { useFirstRunStore } from "@/lib/first-run/store";
import type { FirstRunHabits, FirstRunProfile } from "@/lib/first-run/types";
import { isSupabaseConfigured } from "@/lib/env";
import { useLibraryStore } from "@/lib/local-library";

type DraftValue = string | number | boolean | undefined;

const REQUIRED = (q: OnboardingQuestion) => !q.skippable;

function fieldKey(q: OnboardingQuestion) {
  return q.field.split(".")[1];
}

export function OnboardingFlow({ onFinish }: { onFinish?: () => void }) {
  const data = useFirstRunStore((s) => s.data);
  const setProfile = useFirstRunStore((s) => s.setProfile);
  const setHabits = useFirstRunStore((s) => s.setHabits);
  const completeOnboarding = useFirstRunStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [profile, setProfileDraft] = useState<FirstRunProfile>(data.profile);
  const [habits, setHabitsDraft] = useState<FirstRunHabits>(data.habits);

  const total = ONBOARDING_QUESTIONS.length;
  const q = ONBOARDING_QUESTIONS[step];
  const isLast = step === total - 1;

  const getDraft = (key: string): DraftValue =>
    (q.phase === "profile"
      ? (profile as Record<string, DraftValue>)[key]
      : (habits as Record<string, DraftValue>)[key]);

  const setDraft = (key: string, value: DraftValue) => {
    if (q.phase === "profile") setProfileDraft((p) => ({ ...p, [key]: value }));
    else setHabitsDraft((h) => ({ ...h, [key]: value }));
  };

  // Whether the current question has a usable answer.
  const answered = useMemo(() => {
    const key = fieldKey(q);
    if (q.kind === "piece") return Boolean((habits.pieceName ?? "").toString().trim());
    if (q.kind === "number") {
      const v = getDraft(key);
      return typeof v === "number" ? v > 0 : Boolean(v && Number(v) > 0);
    }
    const v = getDraft(key);
    return v !== undefined && v !== "" && v !== null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, profile, habits]);

  // Persist drafts to the store, then advance (or finish). Accepts explicit
  // drafts so single-choice auto-advance can use the just-picked value without
  // waiting for async setState.
  const goNext = (p: FirstRunProfile = profile, h: FirstRunHabits = habits) => {
    setProfile(p);
    setHabits(h);
    track("onboarding_step", { id: q.id, phase: q.phase });
    if (isLast) {
      // The piece they told us they're working on belongs in their library —
      // so it's already there on the very next screen. Demo mode only; the
      // real-Supabase path inserts it via the /onboarding route's onFinish.
      const pieceName = h.pieceName?.trim();
      if (pieceName && !isSupabaseConfigured() && !useLibraryStore.getState().hasPieceNamed(pieceName)) {
        useLibraryStore.getState().addPiece({ name: pieceName, composer: h.composer ?? "" });
      }
      completeOnboarding();
      onFinish?.();
      return;
    }
    setDirection("left");
    setStep((s) => s + 1);
  };

  const advance = () => goNext();

  const back = () => {
    setDirection("right");
    setStep((s) => Math.max(0, s - 1));
  };

  // Single-choice selections auto-advance for a snappy feel (matches the old
  // instrument step). Text / number / date / piece use the explicit button.
  const pickSingle = (value: DraftValue) => {
    const key = fieldKey(q);
    const nextProfile = q.phase === "profile" ? { ...profile, [key]: value } : profile;
    const nextHabits = q.phase === "habits" ? { ...habits, [key]: value } : habits;
    setProfileDraft(nextProfile);
    setHabitsDraft(nextHabits);
    window.setTimeout(() => goNext(nextProfile, nextHabits), 160);
  };

  const phaseLabel = q.phase === "profile" ? "ABOUT YOU" : "YOUR PRACTICE";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 24px 8px" }}>
          {step > 0 ? (
            <button className="press" aria-label="Back" onClick={back} style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "transparent", color: "var(--color-text-primary)" }}>
              <Icon name="arrow-left" size={22} />
            </button>
          ) : (
            <div style={{ width: 32 }} />
          )}
          <Image src="/logo-black.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-light" />
          <Image src="/logo-white.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-dark" />
          <div style={{ width: 32 }} />
        </div>

        {/* Progress */}
        <div style={{ padding: "0 24px" }}>
          <div className="t-micro" style={{ marginBottom: 8 }}>{phaseLabel} · {step + 1} / {total}</div>
          <div style={{ height: 3, background: "var(--color-track-empty)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((step + 1) / total) * 100}%`, background: "var(--color-text-primary)", borderRadius: 999, transition: "width 320ms var(--ease-out-expo)" }} />
          </div>
        </div>

        {/* Question */}
        <div
          key={step}
          className={direction === "left" ? "screen-enter-left" : "screen-enter-right"}
          style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 0", overflowY: "auto", minHeight: 0 }}
        >
          <div className="t-section" style={{ fontSize: 24 }}>{q.title}</div>
          {q.subtitle && <div className="t-meta" style={{ marginTop: 8 }}>{q.subtitle}</div>}

          <div style={{ marginTop: 24, flex: 1 }}>
            <QuestionInput
              q={q}
              value={getDraft(fieldKey(q))}
              pieceName={habits.pieceName}
              composer={habits.composer}
              onPickSingle={pickSingle}
              onSetText={(v) => setDraft(fieldKey(q), v)}
              onSetPiece={(name, comp) => setHabitsDraft((h) => ({ ...h, pieceName: name, composer: comp }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 16px" }}>
          {q.kind !== "single" && q.kind !== "instrument" && (
            <button className="cta" disabled={REQUIRED(q) && !answered} onClick={advance}>
              {isLast ? "Enter your studio" : "Continue"}
            </button>
          )}
          {q.skippable && (
            <button
              onClick={advance}
              className="t-body press"
              style={{ width: "100%", textAlign: "center", color: "var(--color-text-secondary)", textDecoration: "underline", marginTop: 10, background: "transparent" }}
            >
              {isLast ? "Skip & enter studio" : "Skip"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  pieceName,
  composer,
  onPickSingle,
  onSetText,
  onSetPiece,
}: {
  q: OnboardingQuestion;
  value: DraftValue;
  pieceName?: string;
  composer?: string;
  onPickSingle: (v: DraftValue) => void;
  onSetText: (v: DraftValue) => void;
  onSetPiece: (name: string, composer: string) => void;
}) {
  if (q.kind === "instrument") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {INSTRUMENTS.map((inst) => {
          const active = value === inst;
          return (
            <button
              key={inst}
              onClick={() => onPickSingle(inst)}
              className="press"
              style={{
                background: active ? "var(--color-cta-bg)" : "var(--color-card-fill)",
                color: active ? "var(--color-cta-text)" : "var(--color-text-primary)",
                borderRadius: 12, padding: "18px 16px", textAlign: "left",
                fontSize: 15, fontWeight: 500,
                transition: "background 180ms ease, color 180ms ease",
              }}
            >{inst}</button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "single") {
    // hasTeacher stores a boolean; everything else stores the label.
    const isBool = q.field === "profile.hasTeacher";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(q.options ?? []).map((opt) => {
          const optValue: DraftValue = isBool ? opt === "Yes" : opt;
          const active = value === optValue;
          return (
            <button
              key={opt}
              onClick={() => onPickSingle(optValue)}
              className="press"
              style={{
                background: active ? "var(--color-cta-bg)" : "var(--color-card-fill)",
                color: active ? "var(--color-cta-text)" : "var(--color-text-primary)",
                borderRadius: 12, padding: "16px 18px", textAlign: "left",
                fontSize: 15, fontWeight: 500,
                transition: "background 180ms ease, color 180ms ease",
              }}
            >{opt}</button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "number") {
    return (
      <input
        className="input"
        type="number"
        inputMode="numeric"
        min={1}
        placeholder={q.placeholder}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onSetText(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }

  if (q.kind === "date") {
    return (
      <input
        className="input"
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onSetText(e.target.value)}
      />
    );
  }

  if (q.kind === "piece") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input className="input" placeholder="Piece name" value={pieceName ?? ""} onChange={(e) => onSetPiece(e.target.value, composer ?? "")} />
        <input className="input" placeholder="Composer (optional)" value={composer ?? ""} onChange={(e) => onSetPiece(pieceName ?? "", e.target.value)} />
      </div>
    );
  }

  // text
  return (
    <input
      className="input"
      placeholder={q.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onSetText(e.target.value)}
    />
  );
}
