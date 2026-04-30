"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

const INSTRUMENTS = ["Violin","Viola","Cello","Bass","Piano","Voice","Flute","Oboe","Clarinet","Bassoon","Trumpet","Horn","Trombone","Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");

  const [instrument, setInstrument] = useState("");
  const [piece, setPiece] = useState("");
  const [composer, setComposer] = useState("");
  const [audName, setAudName] = useState("");
  const [audDate, setAudDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = () => { setDirection("left"); setStep((s) => s + 1); };
  const back = () => { setDirection("right"); setStep((s) => Math.max(0, s - 1)); };

  const finish = async () => {
    if (!isSupabaseConfigured()) {
      router.push("/home");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await supabase.from("users").update({
        instrument: instrument || null,
        timezone,
        onboarded_at: new Date().toISOString(),
      }).eq("id", user.id);

      if (piece.trim()) {
        await supabase.from("pieces").insert({
          user_id: user.id,
          name: piece.trim(),
          composer: composer.trim() || null,
          progress: 0,
          is_active: true,
        });
      }

      if (audName.trim() && audDate) {
        await supabase.from("auditions").insert({
          user_id: user.id,
          name: audName.trim(),
          date: audDate,
        });
      }

      router.push("/home");
    } catch (e) {
      setErr((e as Error).message ?? "Could not save your profile.");
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 24px 12px" }}>
        {step > 0
          ? <button className="press" aria-label="Back" onClick={back} style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
              <Icon name="arrow-left" size={22} />
            </button>
          : <div style={{ width: 32 }} />}
        <Image src="/logo-black.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-light" />
        <Image src="/logo-white.png" alt="Andante" width={22} height={22} style={{ borderRadius: 5 }} className="logo-dark" />
        <div style={{ width: 32 }} />
      </div>

      <div
        key={step}
        className={direction === "left" ? "screen-enter-left" : "screen-enter-right"}
        style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px", overflow: "hidden" }}
      >
        {step === 0 && (
          <>
            <div className="t-section" style={{ marginTop: 20, fontSize: 22 }}>What do you play?</div>
            <div className="t-meta" style={{ marginTop: 8 }}>One choice. You can change it later.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 24, overflowY: "auto", flex: 1 }}>
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst}
                  onClick={() => { setInstrument(inst); setTimeout(next, 180); }}
                  className="press"
                  style={{
                    background: instrument === inst ? "var(--color-cta-bg)" : "var(--color-card-fill)",
                    color: instrument === inst ? "var(--color-cta-text)" : "var(--color-text-primary)",
                    borderRadius: 12, padding: "20px 16px",
                    textAlign: "left", fontSize: 15, fontWeight: 500,
                    transition: "background 200ms ease, color 200ms ease",
                  }}
                >{inst}</button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="t-section" style={{ marginTop: 20, fontSize: 22 }}>What are you working on?</div>
            <div className="t-meta" style={{ marginTop: 8 }}>Your first piece. Add more later.</div>
            <div className="col" style={{ gap: 12, marginTop: 24 }}>
              <input className="input" placeholder="Piece name" value={piece} onChange={(e) => setPiece(e.target.value)} />
              <input className="input" placeholder="Composer (optional)" value={composer} onChange={(e) => setComposer(e.target.value)} />
            </div>
            <div style={{ flex: 1 }} />
          </>
        )}
        {step === 2 && (
          <>
            <div className="t-section" style={{ marginTop: 20, fontSize: 22 }}>When is your next audition?</div>
            <div className="t-meta" style={{ marginTop: 8 }}>A real deadline gives the work weight.</div>
            <div className="col" style={{ gap: 12, marginTop: 24 }}>
              <input className="input" placeholder="Audition name" value={audName} onChange={(e) => setAudName(e.target.value)} />
              <input className="input" type="date" value={audDate} onChange={(e) => setAudDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }} />
          </>
        )}

        <div style={{ paddingBottom: 32, paddingTop: 16 }}>
          {err && <div className="t-meta" style={{ color: "#9a3f20", marginBottom: 12, textAlign: "center" }}>{err}</div>}
          {step > 0 && (
            <button
              className="cta"
              disabled={saving || (step === 1 && !piece) || (step === 2 && !audName)}
              onClick={() => step === 2 ? finish() : next()}
            >
              {step === 2 ? (saving ? "Saving…" : "Start Tracking") : "Next"}
            </button>
          )}
          {(step === 1 || step === 2) && (
            <button
              disabled={saving}
              onClick={() => step === 2 ? finish() : next()}
              className="t-body"
              style={{
                width: "100%", textAlign: "center", color: "var(--color-text-secondary)",
                textDecoration: "underline", marginTop: 16,
              }}
            >
              {step === 2 ? "I don't have one yet" : "Skip"}
            </button>
          )}

          <div className="row" style={{ gap: 8, justifyContent: "center", marginTop: 24 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: i === step ? 22 : 6,
                height: 6, borderRadius: 999,
                background: i === step ? "var(--color-text-primary)" : "var(--color-border)",
                transition: "width 200ms var(--ease-out-expo)",
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
