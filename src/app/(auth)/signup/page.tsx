"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { isRememberedAccount, readAuthMemory, rememberAuthEmail } from "@/lib/auth-memory";
import { normalizeEmail, withLoginParams } from "@/lib/auth-routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

function isDuplicateSignupError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "user_already_exists" || message.includes("already registered") || message.includes("already exists");
}

async function checkAccountExists(email: string) {
  const res = await fetch("/api/auth/email-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await res.json() as { exists?: boolean; error?: string };

  if (!res.ok) {
    throw new Error(payload.error ?? "Could not check whether this account exists.");
  }

  return payload.exists === true;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);

  useEffect(() => {
    const memory = readAuthMemory();
    if (memory) {
      router.replace(withLoginParams({ email: memory.email, notice: "account-exists" }));
    }
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setCheckEmail(null);

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setErr("Enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (pass.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        router.replace("/onboarding");
        return;
      }

      if (isRememberedAccount(normalizedEmail)) {
        setErr("An account with this email already exists. Sign in instead.");
        return;
      }

      const exists = await checkAccountExists(normalizedEmail);
      if (exists) {
        rememberAuthEmail(normalizedEmail);
        setErr("An account with this email already exists. Sign in instead.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password: pass });
      if (error) {
        if (isDuplicateSignupError(error)) {
          rememberAuthEmail(normalizedEmail);
          setErr("An account with this email already exists. Sign in instead.");
          return;
        }
        throw error;
      }

      rememberAuthEmail(normalizedEmail);

      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      setPass("");
      setCheckEmail(normalizedEmail);
    } catch (e) {
      setErr((e as Error).message ?? "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <PublicAuthShell
        eyebrow="Check email"
        title="Confirm your account."
        description="Open the confirmation link from Andante, then come back to sign in."
      >
        <div className="col" style={{ gap: 16 }}>
          <div className="t-body" style={{ fontWeight: 500 }}>We sent a confirmation link.</div>
          <div className="t-meta" style={{ color: "var(--marketing-ink-soft)" }}>
            If <strong>{checkEmail}</strong> is new to Andante, the link is waiting in that inbox.
          </div>
          <Link
            href={withLoginParams({ email: checkEmail, notice: "check-email" })}
            className="marketing-primary-cta"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Go to sign in
          </Link>
        </div>
      </PublicAuthShell>
    );
  }

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
        {err && (
          <div className="t-meta" style={{ color: "var(--color-danger)" }}>
            {err.includes("Sign in instead") ? (
              <>
                An account with this email already exists.{" "}
                <Link href={`/login?email=${encodeURIComponent(email)}`} style={{ color: "inherit", textDecoration: "underline" }}>Sign in instead</Link>
              </>
            ) : err}
          </div>
        )}
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
