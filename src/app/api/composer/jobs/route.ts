import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ComposerJobRow, RecordingRow, SessionRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface CreateComposerJobPayload {
  sessionId?: string;
  recordingId?: string;
  storagePath?: string;
  durationSec?: number;
  title?: string;
  pieceId?: string | null;
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to create a composer job." }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const periodEnd = subscription?.period_end ? Date.parse(subscription.period_end) : Number.NaN;
  const entitled =
    (subscription?.plan === "pro" || subscription?.plan === "studio") &&
    (subscription?.status === "active" || subscription?.status === "trialing") &&
    (!Number.isFinite(periodEnd) || periodEnd > Date.now());

  if (!entitled) {
    return NextResponse.json({ error: "Composer Mode requires an active Pro plan." }, { status: 403 });
  }

  // Cap how fast a single user can enqueue transcription jobs (each one signs a
  // recording and calls an external worker on the cron run).
  const limit = rateLimit(`composer-jobs:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: CreateComposerJobPayload;
  try {
    body = await req.json() as CreateComposerJobPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!(session as SessionRow | null)) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  let recordingId = body.recordingId ?? null;
  if (!recordingId && body.storagePath) {
    // IDOR guard: storage RLS keys ownership on the first path segment, so a
    // recording's storage_path must live under this user's prefix. Reject any
    // attempt to register a row pointing at another user's audio object.
    if (!body.storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }
    const duration = Number(body.durationSec);
    if (!Number.isFinite(duration) || duration < 0) {
      return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .insert({
        id,
        user_id: user.id,
        session_id: body.sessionId,
        piece_id: body.pieceId ?? null,
        storage_path: body.storagePath,
        duration_sec: Math.max(1, Math.round(duration)),
        title: (body.title?.trim() || "Composer Mode source").slice(0, 200),
      } as never)
      .select("*")
      .single();

    if (recordingError || !(recording as RecordingRow | null)) {
      if (recordingError) console.error("[composer/jobs] recording insert failed:", recordingError);
      return NextResponse.json({ error: "Could not save the composer recording." }, { status: 500 });
    }
    recordingId = (recording as RecordingRow).id;
  }

  if (!recordingId) {
    return NextResponse.json({ error: "Missing recording source." }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("composer_jobs")
    .insert({
      user_id: user.id,
      session_id: body.sessionId,
      source_recording_id: recordingId,
      status: "queued",
    } as never)
    .select("*")
    .single();

  if (error || !(job as ComposerJobRow | null)) {
    if (error) console.error("[composer/jobs] job insert failed:", error);
    return NextResponse.json({ error: "Could not queue composer transcription." }, { status: 500 });
  }

  return NextResponse.json({ job: job as ComposerJobRow });
}
