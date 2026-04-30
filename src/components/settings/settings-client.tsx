"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

const INSTRUMENTS = ["Violin","Viola","Cello","Bass","Piano","Voice","Flute","Oboe","Clarinet","Bassoon","Trumpet","Horn","Trombone","Other"];

interface Props {
  email: string;
  displayName: string;
  instrument: string;
}

export function SettingsClient({ email, displayName, instrument }: Props) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [inst, setInst] = useState(instrument);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const dirty = name !== displayName || inst !== instrument;

  const save = async () => {
    if (!isSupabaseConfigured() || !dirty) return;
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("users").update({
        display_name: name.trim() || null,
        instrument: inst || null,
      }).eq("id", user.id);
      setSavedAt(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      }
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="col" style={{ gap: 28 }}>
      <section className="card" style={{ padding: 24 }}>
        <div className="t-micro" style={{ marginBottom: 14 }}>Profile</div>
        <div className="col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 6 }}>
            <label className="t-meta" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              value={email}
              disabled
              style={{ opacity: 0.7 }}
            />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="t-meta" htmlFor="name">Display name</label>
            <input
              id="name"
              className="input"
              placeholder="What teachers and judges see"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="t-meta">Instrument</label>
            <div className="chip-row" style={{ flexWrap: "wrap" }}>
              {INSTRUMENTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInst(inst === i ? "" : i)}
                  className={`chip press ${inst === i ? "active" : ""}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 12, marginTop: 8, alignItems: "center" }}>
            <button
              className="cta"
              disabled={saving || !dirty}
              onClick={save}
              style={{ width: "auto", padding: "12px 24px" }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {savedAt && !dirty && (
              <span className="t-meta" style={{ color: "var(--color-text-secondary)" }}>Saved.</span>
            )}
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 24 }}>
        <div className="t-micro" style={{ marginBottom: 14 }}>Account</div>
        <button
          onClick={signOut}
          disabled={signingOut}
          className="press"
          style={{
            padding: "10px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13,
            background: "transparent",
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </div>
  );
}
