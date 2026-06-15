import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth-routes";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Throttle this unauthenticated existence oracle to blunt mass enumeration.
  // (Best-effort, per-instance — production should back this with a shared store.)
  const limit = rateLimit(`email-status:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: { email?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // Intentionally generic. Supabase will still reject duplicate signups, but this
  // endpoint no longer acts as an account-existence oracle for unauthenticated users.
  return NextResponse.json({ ok: true });
}
