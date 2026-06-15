"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/motion/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

// Today as YYYY-MM-DD (local), used as the min selectable audition date.
function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AddAuditionButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = todayKey();

  const reset = () => {
    setName(""); setLocation(""); setDate(""); setErr(null);
  };

  const submit = async () => {
    if (!name.trim() || !date) return;
    if (date < today) {
      setErr("Pick a date in the future.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (!isSupabaseConfigured()) {
        // Demo mode: no backend write, but give honest optimistic feedback
        // instead of silently closing.
        toast.show("Demo: audition saved locally for this session.");
        setOpen(false);
        reset();
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in to add an audition.");
        return;
      }
      const { error } = await supabase.from("auditions").insert({
        user_id: user.id,
        name: name.trim(),
        location: location.trim() || null,
        date,
      });
      if (error) throw error;

      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message ?? "Could not save the audition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press"
        aria-label="Add audition"
        style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}
      >
        <Icon name="plus" size={22} />
      </button>

      <BottomSheet open={open} onClose={() => !saving && setOpen(false)} title="Add an audition">
        <div className="col" style={{ gap: 12 }}>
          <input
            className="input"
            placeholder="Audition name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="input"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {err && <div className="t-meta" style={{ color: "var(--color-danger)" }}>{err}</div>}
          <button
            className="cta"
            disabled={saving || !name.trim() || !date}
            onClick={submit}
            style={{ marginTop: 8 }}
          >
            {saving ? "Saving…" : "Add audition"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
