"use client";

// Stage 4: the monetization moment. Exact spec:
//   paid plans first → carded 10-day auto-renew trial
//   → X dismiss → Free plan framed as "you're missing out"
//   → on choosing Free, one Pro feature (Loop Trainer) is gifted.
// The gift view is only reachable via the Free path. Every exit lands the user
// in stage "done" — no dead ends.

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { track } from "@/lib/first-run/analytics";
import { GIFTED_FEATURE, PRO_PRICE_MONTHLY, SCREEN_BY_ID, TRIAL_DAYS } from "@/lib/first-run/config";
import { useFirstRunStore } from "@/lib/first-run/store";

type View = "paid" | "card" | "free" | "gift";

const PRO_FEATURES = [
  "Unlimited pieces, sessions & recordings",
  "Pathways — NYSSMA, All-State, conservatory tracks",
  "Loop Trainer + Tempo Ramp",
  "Leaderboards & cohort percentile",
  "Submit takes for judge feedback",
  "Mock-audition rooms",
];

const STUDIO_FEATURES = [
  "Everything in Pro, for every student",
  "Studio dashboard + attendance flags",
  "Weekly parent digest emails",
  "Assignment broadcast + jury report cards",
];

const LOCKED_ON_FREE = ["pathways", "loop", "recordings", "rooms", "leaderboard"];

function trialChargeDate() {
  const d = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function Culmination() {
  const habits = useFirstRunStore((s) => s.data.habits);
  const startTrial = useFirstRunStore((s) => s.startTrial);
  const dismissPaid = useFirstRunStore((s) => s.dismissPaid);
  const chooseFree = useFirstRunStore((s) => s.chooseFree);
  const claimGift = useFirstRunStore((s) => s.claimGift);

  const [view, setView] = useState<View>("paid");

  useEffect(() => {
    if (view === "card") track("finale_card_opened");
    if (view === "free") track("finale_free_shown");
    if (view === "gift") track("finale_gift_shown");
  }, [view]);

  const headline = useMemo(() => {
    const goal = habits.primaryGoal ?? "";
    if (habits.auditionName || /audition/i.test(goal)) {
      return { eyebrow: "YOU'RE BUILDING TOWARD SOMETHING", title: "The weeks before an audition are exactly where Pro earns its keep." };
    }
    if (/competition/i.test(goal)) return { eyebrow: "COMPETITION SEASON", title: "Competitors who track everything walk in calmer." };
    if (/exam/i.test(goal)) return { eyebrow: "EXAM PREP", title: "Exam-ready means consistent. Pro keeps you consistent." };
    return { eyebrow: "YOU'RE SET UP", title: "You've seen the essentials. Here's what serious practice unlocks." };
  }, [habits]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--color-bg)", overflowY: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 60px", minHeight: "100%" }}>
        {/* Top bar — X is "no to paid" on the paid view; a back arrow elsewhere */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44 }}>
          {view === "card" ? (
            <button className="press" aria-label="Back" onClick={() => setView("paid")} style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "transparent", color: "var(--color-text-primary)" }}>
              <Icon name="arrow-left" size={22} />
            </button>
          ) : <div style={{ width: 36 }} />}

          {view === "paid" && (
            <button
              className="press"
              aria-label="No thanks"
              onClick={() => { dismissPaid(); setView("free"); }}
              style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "transparent", color: "var(--color-text-muted)" }}
            >
              <Icon name="x" size={22} />
            </button>
          )}
        </div>

        {view === "paid" && <PaidView headline={headline} onTrial={() => setView("card")} />}
        {view === "card" && <CardView onConfirm={startTrial} />}
        {view === "free" && <FreeView onContinueFree={() => { chooseFree(); setView("gift"); }} onBackToPaid={() => setView("paid")} />}
        {view === "gift" && <GiftView onClaim={() => claimGift(GIFTED_FEATURE)} />}
      </div>
    </div>
  );
}

function PaidView({ headline, onTrial }: { headline: { eyebrow: string; title: string }; onTrial: () => void }) {
  return (
    <div className="screen-enter-left" style={{ paddingTop: 8 }}>
      <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 32px" }}>
        <div className="t-micro" style={{ marginBottom: 12 }}>{headline.eyebrow}</div>
        <h1 style={{ fontSize: 30, fontWeight: 500, letterSpacing: -1, lineHeight: 1.12, margin: 0 }}>{headline.title}</h1>
        <p className="t-meta" style={{ marginTop: 14 }}>Try Pro free for {TRIAL_DAYS} days. No commitment until day {TRIAL_DAYS}.</p>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0,1fr)" }} className="md:!grid-cols-2">
        {/* Pro — highlighted, primary CTA = carded trial */}
        <div style={{ padding: 28, borderRadius: 16, background: "var(--color-text-primary)", color: "var(--color-bg)", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
          <div style={{ position: "absolute", top: -10, right: 20, background: "var(--color-bg)", color: "var(--color-text-primary)", fontSize: 10, letterSpacing: 1.5, padding: "5px 10px", borderRadius: 999, fontWeight: 500 }}>MOST STUDENTS</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>Pro</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.4 }}>{PRO_PRICE_MONTHLY}</span>
              <span style={{ fontSize: 13, opacity: 0.6 }}>/ month</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Free for {TRIAL_DAYS} days, then billed monthly.</div>
          </div>
          <button className="press" onClick={onTrial} style={{ background: "var(--color-bg)", color: "var(--color-text-primary)", borderRadius: 10, padding: "13px 18px", fontSize: 14, fontWeight: 500 }}>
            Start your {TRIAL_DAYS}-day free trial
          </button>
          <div style={{ height: 0.5, background: "rgba(255,255,255,0.14)" }} />
          <FeatureList items={PRO_FEATURES} on />
        </div>

        {/* Studio */}
        <div style={{ padding: 28, borderRadius: 16, background: "var(--color-bg)", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>Studio</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.4 }}>$29</span>
              <span className="muted" style={{ fontSize: 13 }}>/ teacher / mo</span>
            </div>
            <div className="t-meta" style={{ marginTop: 4 }}>For teachers running a studio.</div>
          </div>
          <button className="press" onClick={onTrial} style={{ background: "var(--color-text-primary)", color: "var(--color-bg)", borderRadius: 10, padding: "13px 18px", fontSize: 14, fontWeight: 500 }}>
            Start studio trial
          </button>
          <div className="divider" />
          <FeatureList items={STUDIO_FEATURES} />
        </div>
      </div>

      <div className="t-meta" style={{ textAlign: "center", marginTop: 24 }}>
        Card required to start the trial. Cancel anytime before day {TRIAL_DAYS} and you won&rsquo;t be charged.
      </div>
    </div>
  );
}

function FeatureList({ items, on = false }: { items: string[]; on?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((f) => (
        <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 }}>
          <span style={{ marginTop: 1, flexShrink: 0, opacity: on ? 1 : 0.85 }}><Icon name="check" size={15} /></span>
          <span style={{ lineHeight: 1.4 }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

function CardView({ onConfirm }: { onConfirm: () => void }) {
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const ready = number.replace(/\s/g, "").length >= 12 && exp.length >= 4 && cvc.length >= 3 && name.trim().length > 1;

  return (
    <div className="screen-enter-left" style={{ maxWidth: 440, margin: "0 auto", paddingTop: 8 }}>
      <div className="t-micro" style={{ marginBottom: 10 }}>START YOUR FREE TRIAL</div>
      <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.8, lineHeight: 1.15, margin: 0 }}>
        {TRIAL_DAYS} days free, then {PRO_PRICE_MONTHLY}/mo.
      </h1>
      <p className="t-meta" style={{ marginTop: 12 }}>
        We won&rsquo;t charge you today. On {trialChargeDate()} your card is charged {PRO_PRICE_MONTHLY} unless you cancel — and we&rsquo;ll remind you before then. Cancel anytime in Settings.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <input className="input" inputMode="numeric" placeholder="Card number" value={number} onChange={(e) => setNumber(e.target.value)} />
        <div style={{ display: "flex", gap: 12 }}>
          <input className="input" placeholder="MM / YY" value={exp} onChange={(e) => setExp(e.target.value)} style={{ flex: 1 }} />
          <input className="input" inputMode="numeric" placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} style={{ flex: 1 }} />
        </div>
        <input className="input" placeholder="Name on card" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <button className="cta" disabled={!ready} onClick={onConfirm} style={{ marginTop: 20 }}>
        Start free trial
      </button>
      <div className="t-meta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
        <Icon name="shield" size={14} /> Encrypted. You can cancel in one tap.
      </div>
    </div>
  );
}

function FreeView({ onContinueFree, onBackToPaid }: { onContinueFree: () => void; onBackToPaid: () => void }) {
  return (
    <div className="screen-enter-left" style={{ maxWidth: 480, margin: "0 auto", paddingTop: 8 }}>
      <div className="t-micro" style={{ marginBottom: 10 }}>THE FREE PLAN</div>
      <h1 style={{ fontSize: 27, fontWeight: 500, letterSpacing: -0.9, lineHeight: 1.15, margin: 0 }}>
        Free is a fine place to start.
      </h1>
      <p className="t-meta" style={{ marginTop: 12 }}>
        You&rsquo;ll keep your timer, streak, one active piece, your log and goals. But this is what you&rsquo;ll be practicing without:
      </p>

      <div className="card" style={{ marginTop: 20, padding: 8, display: "flex", flexDirection: "column" }}>
        {LOCKED_ON_FREE.map((id) => {
          const s = SCREEN_BY_ID[id];
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", opacity: 0.55 }}>
              <Icon name={s.icon} size={16} />
              <span style={{ fontSize: 14, flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 10, letterSpacing: 1, color: "var(--color-text-muted)" }}>LOCKED</span>
            </div>
          );
        })}
      </div>

      <button className="cta" onClick={onContinueFree} style={{ marginTop: 22 }}>
        Continue with Free
      </button>
      <button
        onClick={onBackToPaid}
        className="t-body press"
        style={{ width: "100%", textAlign: "center", color: "var(--color-text-secondary)", textDecoration: "underline", marginTop: 14, background: "transparent" }}
      >
        Actually, start the {TRIAL_DAYS}-day trial
      </button>
    </div>
  );
}

function GiftView({ onClaim }: { onClaim: () => void }) {
  const loop = SCREEN_BY_ID[GIFTED_FEATURE];
  return (
    <div className="screen-enter-left" style={{ maxWidth: 420, margin: "0 auto", paddingTop: 8, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--color-text-primary)", color: "var(--color-bg)", marginBottom: 20, animation: "revealUp 520ms var(--ease-out-expo) both" }}>
        <Icon name={loop.icon} size={28} />
      </div>
      <div className="t-micro" style={{ marginBottom: 12 }}>A PARTING GIFT</div>
      <h1 style={{ fontSize: 27, fontWeight: 500, letterSpacing: -0.9, lineHeight: 1.15, margin: 0 }}>
        The Loop Trainer is yours.<br />Free, on us.
      </h1>
      <p className="t-meta" style={{ marginTop: 14, maxWidth: 340 }}>
        Slow a passage down, loop the hard bars, and ramp the tempo until it&rsquo;s clean. It&rsquo;s a Pro tool — but we want you to feel what daily practice with Andante is like.
      </p>
      <button className="cta" onClick={onClaim} style={{ marginTop: 28, width: "100%", maxWidth: 300 }}>
        Claim &amp; enter your studio
      </button>
    </div>
  );
}
