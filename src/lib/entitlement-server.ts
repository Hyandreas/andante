// Server-side Pro entitlement check + route guard. Defense-in-depth for audit
// finding C9: the middleware (proxy.ts) is the primary Pro gate, and this
// re-verifies entitlement INSIDE the Pro route so server-rendered Pro data can
// never reach the client even if the middleware matcher ever misses the path —
// mirroring how (app)/layout.tsx re-verifies the session.
//
// No-op in demo mode (no live backend), where the client first-run store drives
// gating for local previews.

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { isPaidEntitlement } from "@/lib/entitlement";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Resolve the signed-in user's paid entitlement against the subscriptions
 *  table. Returns `null` in demo mode to signal "defer to the client gate". */
export async function hasServerProEntitlement(): Promise<boolean | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan,status,period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return isPaidEntitlement(sub, Date.now());
}

/** Call at the top of a Pro server route (or a server wrapper around a Pro
 *  client page). Redirects a non-entitled user to /pricing in live mode;
 *  no-op in demo mode. */
export async function requireProEntitlement(): Promise<void> {
  const entitled = await hasServerProEntitlement();
  if (entitled === false) redirect("/pricing");
}
