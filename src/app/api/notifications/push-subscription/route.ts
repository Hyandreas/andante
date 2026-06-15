import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedPushEndpoint } from "@/lib/web-push";

export const runtime = "nodejs";

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to enable browser push." }, { status: 401 });
  }

  let body: PushSubscriptionBody;
  try {
    body = await req.json() as PushSubscriptionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }
  // Only store endpoints that point at a known push service — the reminder cron
  // POSTs to whatever is stored here, so an arbitrary endpoint is an SSRF vector.
  if (!isAllowedPushEndpoint(body.endpoint)) {
    return NextResponse.json({ error: "Unsupported push endpoint." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: req.headers.get("user-agent"),
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) {
    console.error("[push-subscription] upsert failed:", error);
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage browser push." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing push endpoint." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
