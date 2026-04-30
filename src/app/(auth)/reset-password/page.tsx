"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (pass.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pass !== confirm) {
      setErr("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        router.push("/home");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      router.push("/home");
    } catch (e) {
      setErr((e as Error).message ?? "Could not update password. The reset link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="New password"
      title="Set a new password."
      description="Choose something at least 8 characters. You'll be signed in once it saves."
    >
      <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label className="marketing-input-label" htmlFor="password">New password</label>
          <input
            id="password"
            className="marketing-input"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <label className="marketing-input-label" htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className="marketing-input"
            type="password"
            required
            minLength={8}
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {err && <div className="t-meta" style={{ color: "#9a3f20" }}>{err}</div>}
        <button type="submit" disabled={loading} className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </PublicAuthShell>
  );
}
