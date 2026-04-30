"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

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
        // Design-only preview: skip auth so the app is browsable.
        router.push(next);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      router.push(next);
    } catch (e) {
      setErr((e as Error).message ?? "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <label className="marketing-input-label" htmlFor="email">Email</label>
        <input
          id="email"
          className="marketing-input"
          type="email"
          required
          placeholder="you@studio.edu"
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
          placeholder="Your password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </div>
      {err && <div className="t-meta" style={{ color: "#9a3f20" }}>{err}</div>}
      <button type="submit" disabled={loading} className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <div className="t-meta" style={{ textAlign: "center", color: "var(--marketing-ink-soft)" }}>
        <Link href="/forgot-password" style={{ textDecoration: "underline", color: "inherit" }}>
          Forgot password?
        </Link>
      </div>
      <div className="t-meta" style={{ textAlign: "center", color: "var(--marketing-ink-soft)" }}>
        New here?{" "}
        <Link href="/signup" style={{ textDecoration: "underline", color: "inherit" }}>
          Create an account
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <PublicAuthShell
      eyebrow="Welcome back"
      title="Pick up the next session."
      description="Your sessions, recordings, and audition deadlines are right where you left them."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PublicAuthShell>
  );
}
