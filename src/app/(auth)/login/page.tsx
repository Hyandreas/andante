"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { clearAuthMemory, readAuthMemory, rememberAuthEmail } from "@/lib/auth-memory";
import { DEFAULT_AUTH_DESTINATION, normalizeEmail, sanitizeNextPath, withLoginParams } from "@/lib/auth-routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNextPath(params.get("next"));
  const emailParam = params.get("email");
  const notice = params.get("notice");

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showClearEmail, setShowClearEmail] = useState(false);

  useEffect(() => {
    const emailFromUrl = normalizeEmail(emailParam ?? "");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
      setShowClearEmail(true);
      return;
    }

    const memory = readAuthMemory();
    if (memory) {
      setEmail(memory.email);
      setShowClearEmail(true);
    }
  }, [emailParam]);

  const noticeText =
    notice === "account-exists"
      ? "Looks like this email already has an Andante account. Sign in to continue."
      : notice === "signed-out"
        ? "You're signed out. We kept your email here for next time."
        : notice === "check-email"
          ? "Check your email, then sign in here once your account is confirmed."
          : null;

  const clearRememberedEmail = () => {
    clearAuthMemory();
    setEmail("");
    setShowClearEmail(false);
    router.replace(
      next === DEFAULT_AUTH_DESTINATION
        ? "/login"
        : withLoginParams({ next }),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const normalizedEmail = normalizeEmail(email);
    if (!isSupabaseConfigured()) {
      router.replace(next !== DEFAULT_AUTH_DESTINATION ? next : "/home");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: pass });
      if (error) {
        setErr("Email or password didn't work.");
        return;
      }

      rememberAuthEmail(normalizedEmail);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("users").select("onboarded_at").eq("id", user.id).maybeSingle()
        : { data: null };
      const destination = profile?.onboarded_at
        ? next.startsWith("/onboarding") ? DEFAULT_AUTH_DESTINATION : next
        : "/onboarding";

      router.replace(destination);
      router.refresh();
    } catch {
      setErr("Email or password didn't work.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      {noticeText && (
        <div className="t-meta" style={{ color: "var(--marketing-ink-soft)" }}>
          {noticeText}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <label className="marketing-input-label" htmlFor="email">Email</label>
        <input
          id="email"
          className="marketing-input"
          type="email"
          required
          placeholder="you@studio.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setShowClearEmail(false);
          }}
        />
        {showClearEmail && email && (
          <button
            type="button"
            onClick={clearRememberedEmail}
            className="t-meta"
            style={{ width: "fit-content", color: "var(--marketing-ink-soft)", textDecoration: "underline" }}
          >
            Use a different email
          </button>
        )}
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
      {err && <div className="t-meta" style={{ color: "var(--color-danger)" }}>{err}</div>}
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
