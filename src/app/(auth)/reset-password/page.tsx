"use client";

import { useEffect, useState } from "react";
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
  // Only allow a password change once we've confirmed a genuine recovery
  // session (set up by Supabase from the emailed recovery link). Without this,
  // landing on /reset-password with an unrelated logged-in session would change
  // that account's password. Demo mode (no Supabase) is always "ready".
  const [recoveryReady, setRecoveryReady] = useState(!isSupabaseConfigured());
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        setRecoveryReady(true);
      }
    });

    const timer = setTimeout(() => {
      if (!resolved) setLinkInvalid(true);
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!recoveryReady) {
      setErr("This reset link is invalid or has expired. Request a new one.");
      return;
    }
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
    } catch {
      setErr("Could not update password. The reset link may have expired.");
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
        {linkInvalid && !recoveryReady && (
          <div className="t-meta" style={{ color: "var(--color-danger)" }}>
            This reset link is invalid or has expired. Request a new one from the forgot-password page.
          </div>
        )}
        {err && <div className="t-meta" style={{ color: "var(--color-danger)" }}>{err}</div>}
        <button type="submit" disabled={loading || !recoveryReady} className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </PublicAuthShell>
  );
}
