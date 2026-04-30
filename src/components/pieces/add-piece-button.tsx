"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

const ROLES = ["Concerto", "Sonata", "Etude", "Solo", "Excerpt"];

export function AddPieceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [composer, setComposer] = useState("");
  const [role, setRole] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setName(""); setComposer(""); setRole(""); setProgress(0); setErr(null);
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      if (!isSupabaseConfigured()) {
        setOpen(false);
        reset();
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in to add a piece.");
        return;
      }
      const { error } = await supabase.from("pieces").insert({
        user_id: user.id,
        name: name.trim(),
        composer: composer.trim() || null,
        role: role || null,
        progress,
        is_active: true,
      });
      if (error) throw error;

      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message ?? "Could not save the piece.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press"
        style={{
          padding: "10px 18px", borderRadius: 10,
          background: "var(--color-text-primary)", color: "var(--color-bg)",
          fontSize: 13, fontWeight: 500,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        <Icon name="plus" size={14} /> Add piece
      </button>

      <BottomSheet open={open} onClose={() => !saving && setOpen(false)} title="Add a piece">
        <div className="col" style={{ gap: 12 }}>
          <input
            className="input"
            placeholder="Piece name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="Composer (optional)"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
          />
          <div className="chip-row">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(role === r ? "" : r)}
                className={`chip press ${role === r ? "active" : ""}`}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>
          <div>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="t-micro">Progress</span>
              <span className="tabular" style={{ fontSize: 13 }}>{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          {err && <div className="t-meta" style={{ color: "#9a3f20" }}>{err}</div>}
          <button
            className="cta"
            disabled={saving || !name.trim()}
            onClick={submit}
            style={{ marginTop: 8 }}
          >
            {saving ? "Saving…" : "Add piece"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
