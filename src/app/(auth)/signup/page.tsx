"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        router.push("/onboarding");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;
      router.push("/onboarding");
    } catch (e) {
      setErr((e as Error).message ?? "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="Create account"
      title="Start with a piece and a deadline."
      description="Add your repertoire, set the next audition date, and log your first session."
    >
      <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label className="marketing-input-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="marketing-input"
            type="email"
            required
            placeholder="you@conservatory.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <label className="marketing-input-label" htmlFor="password">Password</label>
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
        {err && <div className="t-meta" style={{ color: "#9a3f20" }}>{err}</div>}
        <button type="submit" disabled={loading} className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
        <div className="t-meta" style={{ textAlign: "center", color: "var(--marketing-ink-soft)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ textDecoration: "underline", color: "inherit" }}>
            Sign in
          </Link>
        </div>
      </form>
    </PublicAuthShell>
  );
}
