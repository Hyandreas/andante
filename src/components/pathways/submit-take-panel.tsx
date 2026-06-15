"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDuration } from "@/lib/utils";
import type { PathwayRequirementView } from "@/lib/app-data";
import type { RecordingRow, TakeFeedbackRow, TakeRow } from "@/lib/supabase/types";

interface TakeStatusPillProps {
  status: "judged" | "pending" | "withdrawn";
  score: number | null;
}

interface TakeView {
  id: string;
  reqLabel: string;
  date: string;
  duration: string;
  status: "judged" | "pending" | "withdrawn";
  score: number | null;
  feedback: {
    who: string;
    role: string;
    note: string;
  }[];
}

interface SubmitTakePanelProps {
  requirements: PathwayRequirementView[];
}

function TakeStatusPill({ status, score }: TakeStatusPillProps) {
  if (status === "judged") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 8px", borderRadius: 999,
        background: "var(--color-text-primary)", color: "var(--color-bg)",
        fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 500,
      }}>
        <span>{score ?? "—"}</span>
        <span style={{ opacity: 0.6, fontWeight: 400 }}>/ 100</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 8px", borderRadius: 999,
      border: "0.5px solid var(--color-border)",
      fontSize: 11, color: "var(--color-text-secondary)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 999,
        background: "var(--color-text-primary)",
        animation: "breathe 1.6s ease-in-out infinite",
      }} />
      {status === "withdrawn" ? "Withdrawn" : "In queue"}
    </div>
  );
}

function formatTakeDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "bin";
}

export function SubmitTakePanel({ requirements }: SubmitTakePanelProps) {
  const [selectedRequirementId, setSelectedRequirementId] = useState(requirements[0]?.id ?? "");
  const [takes, setTakes] = useState<TakeView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationSec, setRecordedDurationSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cap takes at 5 minutes so a forgotten recorder doesn't balloon the upload.
  const MAX_RECORDING_SEC = 5 * 60;
  const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

  useEffect(() => {
    if (!selectedRequirementId && requirements[0]?.id) {
      setSelectedRequirementId(requirements[0].id);
    }
  }, [requirements, selectedRequirementId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    void loadTakes();
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (capTimerRef.current) clearTimeout(capTimerRef.current);
    };
  }, []);

  async function loadTakes() {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTakes([]);
        setIsLoading(false);
        return;
      }

      const { data: takeRows, error: takesError } = await supabase
        .from("takes")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(8);

      if (takesError) throw takesError;

      const safeTakes = (takeRows ?? []) as TakeRow[];
      const recordingIds = safeTakes.map((take) => take.recording_id).filter(Boolean) as string[];
      const takeIds = safeTakes.map((take) => take.id);

      const [{ data: recordings }, { data: feedbackRows }] = await Promise.all([
        recordingIds.length > 0
          ? supabase.from("recordings").select("*").in("id", recordingIds)
          : Promise.resolve({ data: [] as RecordingRow[] }),
        takeIds.length > 0
          ? supabase.from("take_feedback").select("*").in("take_id", takeIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as TakeFeedbackRow[] }),
      ]);

      const recordingById = new Map(((recordings ?? []) as RecordingRow[]).map((recording) => [recording.id, recording]));
      const feedbackByTakeId = ((feedbackRows ?? []) as TakeFeedbackRow[]).reduce((map, feedback) => {
        const current = map.get(feedback.take_id) ?? [];
        current.push(feedback);
        map.set(feedback.take_id, current);
        return map;
      }, new Map<string, TakeFeedbackRow[]>());
      const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));

      setTakes(
        safeTakes.map((take) => {
          const recording = take.recording_id ? recordingById.get(take.recording_id) : null;
          const feedback = feedbackByTakeId.get(take.id) ?? [];
          const requirement = take.requirement_id ? requirementById.get(take.requirement_id) : null;

          return {
            id: take.id,
            reqLabel: requirement?.label ?? recording?.title ?? "Untitled take",
            date: formatTakeDate(take.submitted_at),
            duration: formatDuration(recording?.duration_sec ?? 0),
            status: take.status,
            score: take.score,
            feedback: feedback.map((entry) => ({
              // who = the reviewer's identity, role = their reviewer_role, and
              // note = the feedback body. (Previously these were transposed.)
              who: entry.reviewer_id ?? "Andante reviewer",
              role: entry.reviewer_role ?? "Andante judge queue",
              note: entry.body,
            })),
          };
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function startRecording() {
    setError(null);

    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support microphone capture.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSec = Math.max(
          1,
          Math.round(((Date.now() - (startedAtRef.current ?? Date.now())) / 1000)),
        );
        setRecordedBlob(blob);
        setRecordedDurationSec(durationSec);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        startedAtRef.current = null;
      };

      recorder.start();
      setRecordedBlob(null);
      setRecordedDurationSec(0);
      setIsRecording(true);

      // Auto-stop at the cap with a friendly note.
      capTimerRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          setError(`Takes are capped at ${MAX_RECORDING_SEC / 60} minutes — we stopped the recording for you.`);
          stopRecording();
        }
      }, MAX_RECORDING_SEC * 1000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function stopRecording() {
    if (capTimerRef.current) {
      clearTimeout(capTimerRef.current);
      capTimerRef.current = null;
    }
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  async function uploadTake() {
    if (!recordedBlob || !selectedRequirementId) return;
    if (recordedBlob.size > MAX_RECORDING_BYTES) {
      setError("Takes are capped at 50 MB.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured in this environment.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sign in to upload a take.");

      const requirement = requirements.find((entry) => entry.id === selectedRequirementId);
      const recordingId = crypto.randomUUID();
      const extension = extensionForMimeType(recordedBlob.type);
      const storagePath = `${user.id}/${recordingId}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(storagePath, recordedBlob, {
          contentType: recordedBlob.type || "audio/webm",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: recordingError } = await supabase.from("recordings").insert({
        id: recordingId,
        user_id: user.id,
        storage_path: storagePath,
        duration_sec: recordedDurationSec,
        title: requirement?.label ?? "Take",
      } as never);
      if (recordingError) throw recordingError;

      const { error: takeError } = await supabase.from("takes").insert({
        user_id: user.id,
        requirement_id: selectedRequirementId,
        recording_id: recordingId,
        status: "pending",
      } as never);
      if (takeError) throw takeError;

      setRecordedBlob(null);
      setRecordedDurationSec(0);
      await loadTakes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div style={{
      marginTop: 24, padding: 24, borderRadius: 12,
      background: "var(--color-card-fill)",
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="t-section" style={{ fontSize: 16 }}>Submit a take</div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            Capture a quick audio take, upload it to your recordings bucket, and send it into the review queue.
          </div>
        </div>
        <button
          className="press"
          onClick={() => (isRecording ? stopRecording() : void startRecording())}
          disabled={requirements.length === 0 || isUploading}
          style={{
            padding: "10px 18px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 13, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 8,
            opacity: requirements.length === 0 || isUploading ? 0.5 : 1,
          }}
        >
          <Icon name="mic" size={14} />
          {isRecording ? "Stop recording" : "Record now"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }} className="md:!grid-cols-[minmax(0,1fr)_auto]">
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="t-micro">Requirement</span>
          <select
            className="input"
            value={selectedRequirementId}
            onChange={(event) => setSelectedRequirementId(event.target.value)}
            disabled={requirements.length === 0 || isRecording || isUploading}
          >
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6 }}>
          <span className="t-micro">Clip</span>
          <button
            className="press"
            onClick={() => void uploadTake()}
            disabled={!recordedBlob || isUploading || isRecording}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "0.5px solid var(--color-border)",
              fontSize: 13,
              opacity: !recordedBlob || isUploading || isRecording ? 0.45 : 1,
            }}
          >
            {isUploading ? "Uploading..." : recordedBlob ? "Upload take" : "Record first"}
          </button>
        </div>
      </div>

      {(isRecording || recordedBlob) && (
        <div style={{
          padding: 14,
          borderRadius: 10,
          border: "0.5px solid var(--color-border)",
          background: "var(--color-bg)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isRecording ? "Recording in progress" : "Ready to upload"}
            </div>
            <div className="t-meta" style={{ marginTop: 4 }}>
              {recordedBlob ? formatDuration(recordedDurationSec) : "Listening for your mic..."}
            </div>
          </div>
          {recordedBlob && (
            <div className="t-micro" style={{ alignSelf: "center" }}>
              {Math.round(recordedBlob.size / 1024)} KB
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: 12,
          borderRadius: 10,
          border: "0.5px solid var(--color-danger-border)",
          background: "var(--color-danger-bg)",
          fontSize: 12,
          color: "var(--color-danger)",
        }}>
          {error}
        </div>
      )}

      {!isSupabaseConfigured() && (
        <div className="t-meta">
          Configure Supabase to enable uploads. Until then, the review list stays in demo mode elsewhere in the app.
        </div>
      )}

      {isLoading ? (
        <div className="t-meta">Loading recent takes…</div>
      ) : takes.length === 0 ? (
        <div className="t-meta">No takes yet. Your next recording will show up here as soon as it uploads.</div>
      ) : (
        takes.map((take) => (
          <div key={take.id} style={{
            padding: 16, borderRadius: 10,
            border: "0.5px solid var(--color-border)",
            background: "var(--color-bg)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div className="row-between">
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{take.reqLabel}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>{take.date} · {take.duration}</div>
              </div>
              <TakeStatusPill status={take.status} score={take.score} />
            </div>
            {take.feedback.length > 0 && (
              <div style={{
                display: "flex", flexDirection: "column", gap: 10,
                paddingTop: 8, borderTop: "0.5px solid var(--color-border)",
              }}>
                {take.feedback.map((feedback, index) => (
                  <div key={index} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{feedback.who}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>· {feedback.role}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text-primary)" }}>
                      “{feedback.note}”
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
