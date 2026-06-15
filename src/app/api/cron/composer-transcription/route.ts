import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@/lib/env-server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ComposerJobRow, RecordingRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface WorkerResponse {
  musicXml?: string;
  midiBase64?: string;
  title?: string;
  workerRunId?: string;
}

async function markJob(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  jobId: string,
  values: Record<string, unknown>,
) {
  await admin
    .from("composer_jobs")
    .update({ ...values, updated_at: new Date().toISOString() } as never)
    .eq("id", jobId);
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Composer transcription requires SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const { data: jobs } = await admin
    .from("composer_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(3);

  const queued = (jobs ?? []) as ComposerJobRow[];
  if (queued.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  if (!serverEnv.composerWorkerUrl || !serverEnv.composerWorkerSecret) {
    return NextResponse.json({
      processed: 0,
      configured: false,
      queued: queued.length,
      error: "Composer worker is not configured.",
    }, { status: 503 });
  }

  const results = [];

  for (const job of queued) {
    try {
      await markJob(admin, job.id, { status: "processing", error_message: null });

      if (!job.source_recording_id) {
        throw new Error("Composer job is missing a source recording.");
      }

      const { data: recording } = await admin
        .from("recordings")
        .select("*")
        .eq("id", job.source_recording_id)
        .eq("user_id", job.user_id)
        .maybeSingle();

      const source = recording as RecordingRow | null;
      if (!source) {
        throw new Error("Source recording was not found.");
      }

      // IDOR guard: the storage_path on a recording row is supplied by the user
      // who created the composer job, so it could point at another user's audio
      // object even though the row's user_id matches. Storage RLS keys ownership
      // on the first path segment (`<user-id>/...`); refuse to sign anything that
      // isn't under the job owner's prefix.
      if (!source.storage_path.startsWith(`${job.user_id}/`)) {
        throw new Error("Source recording path does not belong to the job owner.");
      }

      const { data: session } = await admin
        .from("sessions")
        .select("id")
        .eq("id", job.session_id)
        .eq("user_id", job.user_id)
        .maybeSingle();
      if (!session) {
        throw new Error("Composer job session does not belong to the job owner.");
      }

      const { data: signedSource, error: signedError } = await admin.storage
        .from("recordings")
        .createSignedUrl(source.storage_path, 600);

      if (signedError || !signedSource?.signedUrl) {
        throw new Error(signedError?.message ?? "Could not sign source recording.");
      }

      const workerResponse = await fetch(serverEnv.composerWorkerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverEnv.composerWorkerSecret}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          sessionId: job.session_id,
          sourceRecordingId: source.id,
          audioUrl: signedSource.signedUrl,
          targetFormat: ["musicxml", "midi"],
        }),
      });

      if (!workerResponse.ok) {
        throw new Error(`Composer worker returned ${workerResponse.status}: ${await workerResponse.text()}`);
      }

      const output = await workerResponse.json() as WorkerResponse;
      if (!output.musicXml?.trim()) {
        throw new Error("Composer worker did not return MusicXML.");
      }

      const musicId = crypto.randomUUID();
      const title = output.title?.trim() || "Composer Mode sketch";
      const musicXmlPath = `${job.user_id}/${musicId}/score.musicxml`;
      const midiPath = output.midiBase64 ? `${job.user_id}/${musicId}/score.mid` : null;

      const { error: xmlUploadError } = await admin.storage
        .from("sheet-music")
        .upload(musicXmlPath, new Blob([output.musicXml], { type: "application/vnd.recordare.musicxml+xml" }), {
          contentType: "application/vnd.recordare.musicxml+xml",
          upsert: false,
        });
      if (xmlUploadError) throw xmlUploadError;

      if (midiPath && output.midiBase64) {
        const midiBuffer = Buffer.from(output.midiBase64, "base64");
        const { error: midiUploadError } = await admin.storage
          .from("sheet-music")
          .upload(midiPath, midiBuffer, {
            contentType: "audio/midi",
            upsert: false,
          });
        if (midiUploadError) throw midiUploadError;
      }

      const { error: musicError } = await admin.from("sheet_music").insert({
        id: musicId,
        user_id: job.user_id,
        title,
        origin: "generated",
        source_name: "Composer Mode",
        attribution: "Auto-generated from a Composer Mode recording.",
        is_public: false,
      } as never);
      if (musicError) throw musicError;

      const fileRows = [
        {
          sheet_music_id: musicId,
          kind: "musicxml",
          storage_bucket: "sheet-music",
          storage_path: musicXmlPath,
          content_type: "application/vnd.recordare.musicxml+xml",
          display_order: 0,
        },
        ...(midiPath ? [{
          sheet_music_id: musicId,
          kind: "midi",
          storage_bucket: "sheet-music",
          storage_path: midiPath,
          content_type: "audio/midi",
          display_order: 1,
        }] : []),
      ];

      const { error: filesError } = await admin.from("sheet_music_files").insert(fileRows as never);
      if (filesError) throw filesError;

      await admin.from("session_sheet_music").upsert({
        session_id: job.session_id,
        sheet_music_id: musicId,
        role: "generated",
      } as never);

      await markJob(admin, job.id, {
        status: "completed",
        generated_sheet_music_id: musicId,
        worker_run_id: output.workerRunId ?? null,
        completed_at: new Date().toISOString(),
      });

      results.push({ jobId: job.id, status: "completed", sheetMusicId: musicId });
    } catch (error) {
      const message = (error as Error).message ?? "Composer transcription failed.";
      await markJob(admin, job.id, {
        status: "failed",
        error_message: message,
      });
      results.push({ jobId: job.id, status: "failed", error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
