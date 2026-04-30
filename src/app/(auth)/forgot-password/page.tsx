"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicAuthShell } from "@/components/marketing/public-auth-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, env } from "@/lib/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setSent(true);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${env.siteUrl}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr((e as Error).message ?? "Could not send the reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="Reset password"
      title="We'll send you a link."
      description="Enter the email you signed up with. The link expires in one hour."
    >
      {sent ? (
        <div className="col" style={{ gap: 16 }}>
          <div className="t-body" style={{ fontWeight: 500 }}>Check your inbox.</div>
          <div className="t-meta" style={{ color: "var(--marketing-ink-soft)" }}>
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </div>
          <Link href="/login" className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
            Back to sign in
          </Link>
        </div>
      ) : (
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
          {err && <div className="t-meta" style={{ color: "#9a3f20" }}>{err}</div>}
          <button type="submit" disabled={loading} className="marketing-primary-cta" style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <div className="t-meta" style={{ textAlign: "center", color: "var(--marketing-ink-soft)" }}>
            <Link href="/login" style={{ textDecoration: "underline", color: "inherit" }}>
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </PublicAuthShell>
  );
}
