"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { TimerDisplay } from "@/components/ui/timer-display";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SheetMusicViewer } from "@/components/session/sheet-music-viewer";
import { SessionRecap } from "@/components/session/session-recap";
import { useToast } from "@/components/ui/motion/toast";
import { useSessionStore, type SessionMode } from "@/store/session-store";
import { enqueue } from "@/lib/offline-sessions";
import { PIECES, type Piece as FallbackPiece } from "@/lib/sample-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDuration } from "@/lib/utils";
import {
  SHEET_MUSIC_BUCKET,
  extensionForSheetMusicFile,
  fileKindForMimeType,
  sanitizeStorageName,
  toSheetMusicView,
  type SheetMusicView,
} from "@/lib/sheet-music";
import type {
  FocusType,
  PathwayRequirementRow,
  PieceRow,
  SheetMusicFileRow,
  SheetMusicRow,
  UserPreferenceRow,
} from "@/lib/supabase/types";

const VALID_FOCUS: ReadonlyArray<FocusType> = ["repertoire", "scales", "etudes", "sight-reading"];
const FOCUS = ["Repertoire", "Scales", "Etudes", "Sight-Reading"] as const;
const MAX_SHEET_MUSIC_BYTES = 25 * 1024 * 1024;
const MAX_COMPOSER_RECORDING_BYTES = 100 * 1024 * 1024;
const FOCUS_LABEL_BY_ID: Record<FocusType, (typeof FOCUS)[number]> = {
  repertoire: "Repertoire",
  scales: "Scales",
  etudes: "Etudes",
  "sight-reading": "Sight-Reading",
};

type SetupChoice = "existing" | "upload" | "composer";

interface ImslpResult {
  pageId: number;
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceName: string;
  rightsNote: string;
}

interface RecommendedContext {
  label: string;
  pieceLabel: string | null;
  sheetMusicId: string | null;
}

interface ComposerClip {
  blob: Blob;
  durationSec: number;
}

function focusId(label: (typeof FOCUS)[number]): FocusType {
  const lower = label.toLowerCase();
  return VALID_FOCUS.includes(lower as FocusType) ? (lower as FocusType) : "repertoire";
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled score";
}

function audioExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function demoSheetMusicForPieces(pieces: FallbackPiece[]): SheetMusicView[] {
  return pieces.map((piece) => ({
    id: `demo-${piece.id}`,
    title: piece.name,
    composer: piece.composer,
    origin: "upload",
    pieceId: piece.id,
    sourceName: "Demo Library",
    sourceUrl: null,
    license: null,
    attribution: null,
    files: [],
  }));
}

export function SessionPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryPathwayId = searchParams.get("pathway");
  const entryRequirementId = searchParams.get("requirement");

  const {
    inSession, elapsed, paused, pieceId, pieceName, sheetMusicId, sheetMusicTitle,
    sessionMode, focusType, notes, recorderLost,
    start, pause, resume, stop,
    setElapsed, setFocusType, setNotes, setPiece, setSheetMusic, acknowledgeRecorderLost,
  } = useSessionStore();

  const [pieceSheetOpen, setPieceSheetOpen] = useState(false);
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pieces, setPieces] = useState<FallbackPiece[]>(PIECES);
  const [sheetMusic, setSheetMusicList] = useState<SheetMusicView[]>(demoSheetMusicForPieces(PIECES));
  const [selectedSheetMusicId, setSelectedSheetMusicId] = useState<string | null>(null);
  const [setupChoice, setSetupChoice] = useState<SetupChoice>("existing");
  const [recommended, setRecommended] = useState<RecommendedContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadComposer, setUploadComposer] = useState("");

  const [imslpQuery, setImslpQuery] = useState("");
  const [imslpResults, setImslpResults] = useState<ImslpResult[]>([]);
  const [imslpSearching, setImslpSearching] = useState(false);

  const [composerRecording, setComposerRecording] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [recap, setRecap] = useState<{ minutes: number; pieceName: string | null } | null>(null);
  const toast = useToast();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const composerStartedAtRef = useRef<number | null>(null);
  const composerStopResolverRef = useRef<((clip: ComposerClip | null) => void) | null>(null);

  const selectedSheetMusic = useMemo(
    () => sheetMusic.find((item) => item.id === selectedSheetMusicId) ?? null,
    [selectedSheetMusicId, sheetMusic],
  );

  const activeSheetMusic = useMemo(
    () => sheetMusic.find((item) => item.id === sheetMusicId) ?? selectedSheetMusic ?? null,
    [selectedSheetMusic, sheetMusic, sheetMusicId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSessionSetup() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        const demo = demoSheetMusicForPieces(PIECES);
        setSheetMusicList(demo);
        setSelectedSheetMusicId((current) => current ?? demo[0]?.id ?? null);
        if (!useSessionStore.getState().pieceId && PIECES[0]) {
          setPiece(PIECES[0].id, PIECES[0].name);
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        const [{ data: pieceRows }, { data: preferenceRow }, { data: musicRows }, { data: requirementRow }] = await Promise.all([
          supabase
            .from("pieces")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("sheet_music")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(60),
          entryRequirementId
            ? supabase
              .from("pathway_requirements")
              .select("*")
              .eq("id", entryRequirementId)
              .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (cancelled) return;

        const loadedPieces = ((pieceRows ?? []) as PieceRow[]).map((piece) => ({
          id: piece.id,
          name: piece.name,
          composer: piece.composer ?? "",
          role: piece.role ?? "",
          progress: piece.progress / 100,
          weekTime: "",
          lastPracticed: "",
          totalSessions: 0,
        }));
        if (loadedPieces.length > 0) setPieces(loadedPieces);

        const defaultFocus = (preferenceRow as UserPreferenceRow | null)?.default_focus_type;
        if (defaultFocus && VALID_FOCUS.includes(defaultFocus)) {
          setFocusType(FOCUS_LABEL_BY_ID[defaultFocus]);
        }

        const safeMusicRows = (musicRows ?? []) as SheetMusicRow[];
        const musicIds = safeMusicRows.map((row) => row.id);
        const { data: fileRows } = musicIds.length > 0
          ? await supabase
            .from("sheet_music_files")
            .select("*")
            .in("sheet_music_id", musicIds)
            .order("display_order", { ascending: true })
          : { data: [] as SheetMusicFileRow[] };

        const views = safeMusicRows.map((row) => toSheetMusicView(row, (fileRows ?? []) as SheetMusicFileRow[]));
        if (views.length > 0) setSheetMusicList(views);

        const requirement = requirementRow as PathwayRequirementRow | null;
        if (requirement) {
          setRecommended({
            label: requirement.label,
            pieceLabel: requirement.piece_label,
            sheetMusicId: requirement.sheet_music_id,
          });

          const requirementMusic = requirement.sheet_music_id
            ? views.find((item) => item.id === requirement.sheet_music_id)
            : null;
          const matchingMusic = requirement.piece_label
            ? views.find((item) => item.title.toLowerCase().includes(requirement.piece_label!.toLowerCase()))
            : null;
          const selected = requirementMusic ?? matchingMusic ?? views[0] ?? null;
          setSelectedSheetMusicId(selected?.id ?? null);

          const matchingPiece = requirement.piece_label
            ? loadedPieces.find((item) => requirement.piece_label && item.name.toLowerCase().includes(requirement.piece_label.toLowerCase()))
            : null;
          if (matchingPiece) {
            setPiece(matchingPiece.id, matchingPiece.name);
          }
        } else {
          setSelectedSheetMusicId((current) => current ?? views[0]?.id ?? null);
        }

        if (!useSessionStore.getState().pieceId) {
          const first = loadedPieces[0] ?? PIECES[0];
          if (first) setPiece(first.id, first.name);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSessionSetup();

    return () => {
      cancelled = true;
    };
  }, [entryRequirementId, setFocusType, setPiece]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!inSession || paused) return;
    const id = setInterval(() => {
      const s = useSessionStore.getState();
      if (!s.startTime) return;
      const seconds = Math.floor((Date.now() - s.startTime - s.pausedTotal) / 1000);
      setElapsed(seconds);
    }, 250);
    return () => clearInterval(id);
  }, [inSession, paused, setElapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (inSession && e.key === " ") {
        e.preventDefault();
        paused ? resume() : pause();
      }
      if (inSession && e.key === "Escape") {
        e.preventDefault();
        setConfirmOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inSession, paused, pause, resume]);

  async function uploadSelectedSheetMusic() {
    if (!uploadFile) return selectedSheetMusic;

    const title = uploadTitle.trim() || titleFromFile(uploadFile);
    const kind = fileKindForMimeType(uploadFile.type, uploadFile.name);
    if (uploadFile.size > MAX_SHEET_MUSIC_BYTES) {
      throw new Error("Sheet music uploads are capped at 25 MB.");
    }

    if (!isSupabaseConfigured()) {
      const localUrl = URL.createObjectURL(uploadFile);
      const local: SheetMusicView = {
        id: `local-${crypto.randomUUID()}`,
        title,
        composer: uploadComposer.trim() || null,
        origin: "upload",
        pieceId: pieceId,
        sourceName: "Local upload",
        sourceUrl: null,
        license: null,
        attribution: null,
        files: [{
          id: `local-file-${crypto.randomUUID()}`,
          kind,
          storageBucket: null,
          storagePath: null,
          externalUrl: localUrl,
          contentType: uploadFile.type || null,
          sizeBytes: uploadFile.size,
          displayOrder: 0,
        }],
      };
      setSheetMusicList((items) => [local, ...items]);
      setSelectedSheetMusicId(local.id);
      return local;
    }

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to upload sheet music.");

    const musicId = crypto.randomUUID();
    const ext = extensionForSheetMusicFile(uploadFile);
    const storagePath = `${user.id}/${musicId}/${sanitizeStorageName(title)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SHEET_MUSIC_BUCKET)
      .upload(storagePath, uploadFile, {
        contentType: uploadFile.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: musicRow, error: musicError } = await supabase
      .from("sheet_music")
      .insert({
        id: musicId,
        user_id: user.id,
        piece_id: pieceId,
        title,
        composer: uploadComposer.trim() || null,
        origin: "upload",
        is_public: false,
      } as never)
      .select("*")
      .single();
    if (musicError || !musicRow) throw musicError ?? new Error("Could not save sheet music.");

    const { data: fileRows, error: fileError } = await supabase
      .from("sheet_music_files")
      .insert({
        sheet_music_id: musicId,
        kind,
        storage_bucket: SHEET_MUSIC_BUCKET,
        storage_path: storagePath,
        content_type: uploadFile.type || null,
        size_bytes: uploadFile.size,
        display_order: 0,
      } as never)
      .select("*");
    if (fileError) throw fileError;

    const view = toSheetMusicView(musicRow as SheetMusicRow, (fileRows ?? []) as SheetMusicFileRow[]);
    setSheetMusicList((items) => [view, ...items]);
    setSelectedSheetMusicId(view.id);
    setUploadFile(null);
    setUploadTitle("");
    setUploadComposer("");
    return view;
  }

  async function searchImslp() {
    if (!imslpQuery.trim()) return;
    setImslpSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/sheet-music/imslp/search?q=${encodeURIComponent(imslpQuery.trim())}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not search IMSLP.");
      setImslpResults(json.results ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImslpSearching(false);
    }
  }

  async function importImslp(result: ImslpResult) {
    setError(null);
    try {
      const response = await fetch("/api/sheet-music/imslp/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          pageId: result.pageId,
          sourceUrl: result.sourceUrl,
          sourceName: result.sourceName,
          rightsStatus: "public-domain",
          license: "public-domain",
          attribution: `IMSLP: ${result.title}`,
          pieceId,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not import IMSLP record.");
      const view = toSheetMusicView(json.sheetMusic as SheetMusicRow, (json.files ?? []) as SheetMusicFileRow[]);
      setSheetMusicList((items) => [view, ...items]);
      setSelectedSheetMusicId(view.id);
      setSetupChoice("existing");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function startComposerCapture() {
    setComposerError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("This browser does not support microphone capture.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    composerStartedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const durationSec = Math.max(1, Math.round((Date.now() - (composerStartedAtRef.current ?? Date.now())) / 1000));
      const clip = blob.size > 0 ? { blob, durationSec } : null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      composerStartedAtRef.current = null;
      setComposerRecording(false);
      composerStopResolverRef.current?.(clip);
      composerStopResolverRef.current = null;
    };

    recorder.start();
    setComposerRecording(true);
  }

  function stopComposerCapture() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise<ComposerClip | null>((resolve) => {
      composerStopResolverRef.current = resolve;
      recorder.stop();
    });
  }

  async function startSessionFromSetup(choice = setupChoice) {
    // Guard against a double-tap firing the async start twice (which would
    // open a second mic stream / clobber the just-started session).
    if (starting || useSessionStore.getState().inSession) return;
    setStarting(true);
    setError(null);
    setComposerError(null);

    try {
      if (choice === "composer") {
        await startComposerCapture();
      }

      const music = choice === "upload" ? await uploadSelectedSheetMusic() : selectedSheetMusic;
      start({
        pieceId,
        pieceName,
        sheetMusicId: music?.id.startsWith("demo-") || music?.id.startsWith("local-") ? null : music?.id ?? null,
        sheetMusicTitle: music?.title ?? null,
        sessionMode: choice === "composer" ? "composer" : "practice",
        entryPathwayId,
        entryRequirementId,
      });
      setSheetMusic(music?.id ?? null, music?.title ?? null);
    } catch (err) {
      const message = (err as Error).message;
      choice === "composer" ? setComposerError(message) : setError(message);
    } finally {
      setStarting(false);
    }
  }

  async function saveSessionNow(clip: ComposerClip | null) {
    const state = useSessionStore.getState();
    const startTs = state.startTime ?? Date.now() - elapsed * 1000;
    const endTs = Date.now();
    const persistableSheetMusicId = state.sheetMusicId?.startsWith("demo-") || state.sheetMusicId?.startsWith("local-")
      ? null
      : state.sheetMusicId;

    const pending = {
      id: crypto.randomUUID(),
      startedAt: startTs,
      endedAt: endTs,
      durationSec: Math.max(0, elapsed),
      pieceId: state.pieceId,
      sheetMusicIds: persistableSheetMusicId ? [persistableSheetMusicId] : [],
      sessionMode: state.sessionMode,
      entryPathwayId: state.entryPathwayId,
      entryRequirementId: state.entryRequirementId,
      focusType: focusId(state.focusType),
      notes: state.notes,
    };

    let savedSessionId: string | null = null;

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: row, error: insertError } = await supabase
            .from("sessions")
            .insert({
              user_id: user.id,
              started_at: new Date(pending.startedAt).toISOString(),
              ended_at: new Date(pending.endedAt).toISOString(),
              duration_sec: pending.durationSec,
              focus_type: VALID_FOCUS.includes(pending.focusType as FocusType) ? pending.focusType : null,
              session_mode: pending.sessionMode === "composer" ? "composer" : "practice",
              entry_pathway_id: pending.entryPathwayId ?? null,
              entry_requirement_id: pending.entryRequirementId ?? null,
              notes: pending.notes || null,
            } as never)
            .select("id")
            .single();

          if (insertError) throw insertError;
          savedSessionId = row?.id ?? null;

          if (savedSessionId && pending.pieceId) {
            await supabase.from("session_pieces").insert({
              session_id: savedSessionId,
              piece_id: pending.pieceId,
            } as never);
          }

          if (savedSessionId && pending.sheetMusicIds.length > 0) {
            await supabase.from("session_sheet_music").insert(
              pending.sheetMusicIds.map((id) => ({
                session_id: savedSessionId,
                sheet_music_id: id,
              })) as never,
            );
          }

          if (savedSessionId && clip && state.sessionMode === "composer") {
            await queueComposerJob(savedSessionId, clip, state.pieceId);
          }
        }
      } catch (err) {
        if (pending.sessionMode === "composer") {
          setComposerError((err as Error).message);
        }
      }
    }

    if (!savedSessionId) {
      await enqueue(pending);
    }
  }

  async function queueComposerJob(sessionId: string, clip: ComposerClip, activePieceId: string | null) {
    if (clip.blob.size > MAX_COMPOSER_RECORDING_BYTES) {
      throw new Error("Composer recordings are capped at 100 MB.");
    }

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to queue Composer Mode transcription.");

    const recordingId = crypto.randomUUID();
    const extension = audioExtension(clip.blob.type);
    const storagePath = `${user.id}/${recordingId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(storagePath, clip.blob, {
        contentType: clip.blob.type || "audio/webm",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const response = await fetch("/api/composer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        storagePath,
        durationSec: clip.durationSec,
        title: `${pieceName ?? "Composer Mode"} source`,
        pieceId: activePieceId,
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not queue composer transcription.");
  }

  async function endSession() {
    setSaving(true);
    setError(null);
    try {
      const clip = sessionMode === "composer" ? await stopComposerCapture() : null;
      const minutes = Math.max(1, Math.round(elapsed / 60));
      const finishedPieceName = pieceName;
      await saveSessionNow(clip);
      stop();
      setConfirmOpen(false);
      setRecap({ minutes, pieceName: finishedPieceName ?? null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const choiceButton = (choice: SetupChoice, icon: "music" | "plus" | "mic", title: string, meta: string) => (
    <button
      key={choice}
      onClick={() => setSetupChoice(choice)}
      className="press"
      style={{
        minHeight: 96,
        borderRadius: 8,
        border: `0.5px solid ${setupChoice === choice ? "var(--color-text-primary)" : "var(--color-border)"}`,
        background: setupChoice === choice ? "var(--color-card-fill-deep)" : "var(--color-card-fill)",
        padding: 16,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div className="row-between">
        <Icon name={icon} size={18} />
        {setupChoice === choice && <Icon name="check" size={16} />}
      </div>
      <div>
        <div className="t-card-label">{title}</div>
        <div className="t-meta" style={{ marginTop: 4 }}>{meta}</div>
      </div>
    </button>
  );

  // Shown after a session is saved. Lives before the `!inSession` branch
  // because endSession() calls stop() (inSession → false) *and* sets recap in
  // the same tick; if this overlay rendered only inside the in-session branch
  // it would never appear and the user would drop back to the setup screen
  // instead of seeing the recap and being routed home.
  if (recap) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "grid",
          placeItems: "center",
          padding: 24,
          zIndex: 60,
          animation: "fadeIn 220ms ease-out both",
        }}
      >
        <SessionRecap
          minutes={recap.minutes}
          pieceName={recap.pieceName ?? undefined}
          onClose={() => {
            setRecap(null);
            router.push("/home");
          }}
          onShare={() => toast.show("Sent to your teacher.", { tone: "success" })}
        />
      </div>
    );
  }

  if (!inSession) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "var(--color-bg)",
        overflowY: "auto",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 48px" }}>
          <div className="row-between" style={{ alignItems: "flex-start", gap: 18, marginBottom: 28 }}>
            <div>
              <div className="t-micro">Practice session</div>
              <div style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: -1, fontWeight: 500, marginTop: 6 }}>
                Choose your music
              </div>
            </div>
            <button
              className="press"
              onClick={() => router.back()}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "0.5px solid var(--color-border)",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="Close session setup"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(1, minmax(0, 1fr))", marginBottom: 18 }} className="md:!grid-cols-3">
            {choiceButton("existing", "music", "Existing", recommended ? "Recommended from pathway" : "Your library")}
            {choiceButton("upload", "plus", "Add or import", "PDF, image, MusicXML, IMSLP")}
            {choiceButton("composer", "mic", "Composer Mode", "Play first, score later")}
          </div>

          <div style={{ display: "grid", gap: 18 }} className="lg:!grid-cols-[minmax(0,1fr)_380px]">
            <div style={{
              border: "0.5px solid var(--color-border)",
              borderRadius: 8,
              padding: 18,
              background: "var(--color-card-fill)",
              minHeight: 360,
            }}>
              {loading ? (
                <div className="t-meta">Loading session setup...</div>
              ) : setupChoice === "existing" ? (
                <div className="col" style={{ gap: 12 }}>
                  {recommended && (
                    <div style={{
                      padding: 14,
                      borderRadius: 8,
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-bg)",
                    }}>
                      <div className="t-micro">Pathway recommendation</div>
                      <div className="t-card-label" style={{ marginTop: 4 }}>{recommended.label}</div>
                      <div className="t-meta" style={{ marginTop: 2 }}>{recommended.pieceLabel ?? "Requirement music"}</div>
                    </div>
                  )}

                  <div className="t-micro">Sheet music</div>
                  <div className="col" style={{ gap: 8 }}>
                    {sheetMusic.map((item) => (
                      <button
                        key={item.id}
                        className="press"
                        onClick={() => setSelectedSheetMusicId(item.id)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: 14,
                          borderRadius: 8,
                          border: "0.5px solid var(--color-border)",
                          background: selectedSheetMusicId === item.id ? "var(--color-bg)" : "transparent",
                          textAlign: "left",
                        }}
                      >
                        <Icon name={item.origin === "generated" ? "mic" : "music"} size={17} />
                        <div style={{ minWidth: 0 }}>
                          <div className="t-card-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </div>
                          <div className="t-meta" style={{ marginTop: 2 }}>
                            {[item.composer, item.sourceName ?? item.origin].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {selectedSheetMusicId === item.id && <Icon name="check" size={16} />}
                      </button>
                    ))}
                    {sheetMusic.length === 0 && <div className="t-meta">No sheet music in your library yet.</div>}
                  </div>
                </div>
              ) : setupChoice === "upload" ? (
                <div style={{ display: "grid", gap: 18 }} className="lg:!grid-cols-2">
                  <div className="col" style={{ gap: 12 }}>
                    <div className="t-section" style={{ fontSize: 16 }}>Upload</div>
                    <input
                      className="input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.musicxml,.mxl,application/pdf,image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setUploadFile(file);
                        if (file && !uploadTitle) setUploadTitle(titleFromFile(file));
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Title"
                      value={uploadTitle}
                      onChange={(event) => setUploadTitle(event.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Composer"
                      value={uploadComposer}
                      onChange={(event) => setUploadComposer(event.target.value)}
                    />
                    {uploadFile && (
                      <div className="t-meta">
                        {fileKindForMimeType(uploadFile.type, uploadFile.name).toUpperCase()} · {Math.round(uploadFile.size / 1024)} KB
                      </div>
                    )}
                  </div>

                  <div className="col" style={{ gap: 12 }}>
                    <div className="t-section" style={{ fontSize: 16 }}>IMSLP</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                      <input
                        className="input"
                        placeholder="Search public-domain scores"
                        value={imslpQuery}
                        onChange={(event) => setImslpQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void searchImslp();
                        }}
                      />
                      <button
                        className="press"
                        onClick={() => void searchImslp()}
                        disabled={imslpSearching}
                        style={{ border: "0.5px solid var(--color-border)", borderRadius: 8, padding: "0 14px" }}
                      >
                        {imslpSearching ? "..." : "Search"}
                      </button>
                    </div>
                    <div className="col" style={{ gap: 8 }}>
                      {imslpResults.map((result) => (
                        <button
                          key={result.pageId}
                          className="press"
                          onClick={() => void importImslp(result)}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            border: "0.5px solid var(--color-border)",
                            background: "var(--color-bg)",
                            textAlign: "left",
                          }}
                        >
                          <div className="t-card-label">{result.title}</div>
                          <div className="t-meta" style={{ marginTop: 4 }}>{result.snippet || result.rightsNote}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", minHeight: 300, placeItems: "center", textAlign: "center", padding: 20 }}>
                  <div style={{ maxWidth: 420 }}>
                    <div style={{
                      width: 58,
                      height: 58,
                      margin: "0 auto 18px",
                      borderRadius: 999,
                      border: "0.5px solid var(--color-border)",
                      display: "grid",
                      placeItems: "center",
                    }}>
                      <Icon name="mic" size={24} />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.5 }}>Composer Mode</div>
                    <div className="t-meta" style={{ marginTop: 8 }}>
                      {composerError ?? "Your microphone starts when the session starts. The source recording is queued for notation after you save."}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 8,
                  border: "0.5px solid var(--color-danger-border)",
                  background: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  fontSize: 12,
                }}>
                  {error}
                </div>
              )}
            </div>

            <div className="col" style={{ gap: 14 }}>
              <div style={{
                border: "0.5px solid var(--color-border)",
                borderRadius: 8,
                padding: 16,
                background: "var(--color-card-fill)",
              }}>
                <div className="t-micro">Piece</div>
                <button
                  className="press row-between"
                  onClick={() => setPieceSheetOpen(true)}
                  style={{ width: "100%", gap: 12, textAlign: "left", marginTop: 8 }}
                >
                  <div>
                    <div className="t-card-label">{pieceName ?? "Free Practice"}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>Tap to switch</div>
                  </div>
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>

              <SheetMusicViewer sheetMusic={selectedSheetMusic} compact />

              <button
                className="cta"
                disabled={saving || starting}
                onClick={() => void startSessionFromSetup()}
              >
                {starting ? "Starting…" : setupChoice === "composer" ? "Start Composer Mode" : "Start Practice"}
              </button>
            </div>
          </div>
        </div>

        <BottomSheet open={pieceSheetOpen} onClose={() => setPieceSheetOpen(false)} title="Switch Piece">
          <PiecePicker pieces={pieces} activePieceId={pieceId} onPick={(id, name) => { setPiece(id, name); setPieceSheetOpen(false); }} />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--color-bg)",
      zIndex: 40,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 24px 12px", gap: 16 }}>
        <button onClick={() => setConfirmOpen(true)} className="press" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          fontSize: 12, color: "var(--color-text-secondary)",
          padding: "6px 10px", border: "0.5px solid var(--color-border)", borderRadius: 8,
        }}>
          <Icon name="arrow-left" size={14} /> End Session <Kbd>Esc</Kbd>
        </button>
        <div className="t-micro">{sessionMode === "composer" ? "Composer Mode" : "Practice"}</div>
        <button onClick={() => paused ? resume() : pause()} className="press" aria-label={paused ? "Resume" : "Pause"}
          style={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
          <Icon name={paused ? "play" : "pause"} size={22} />
        </button>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gap: 18,
        padding: "0 24px 24px",
      }} className="lg:!grid-cols-[minmax(0,1fr)_360px]">
        <div style={{ minHeight: 0, overflow: "auto" }}>
          <SheetMusicViewer sheetMusic={activeSheetMusic} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto", paddingBottom: 4 }}>
          <div style={{ opacity: paused ? 0.5 : 1, transition: "opacity 200ms ease", display: "grid", placeItems: "center", padding: "28px 0 8px" }}>
            <TimerDisplay seconds={elapsed} />
          </div>

          {recorderLost && (
            <div style={{
              padding: 14,
              borderRadius: 8,
              border: "0.5px solid var(--color-danger-border)",
              background: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <div>
                <div className="t-card-label" style={{ color: "var(--color-danger)" }}>Composer recording stopped</div>
                <div className="t-meta" style={{ marginTop: 2, color: "var(--color-danger)" }}>
                  The page reloaded, so source audio is no longer being captured. Your time is still being tracked as a normal session.
                </div>
              </div>
              <button
                className="press"
                onClick={acknowledgeRecorderLost}
                aria-label="Dismiss"
                style={{ width: 26, height: 26, display: "grid", placeItems: "center", flexShrink: 0, color: "var(--color-danger)" }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          {sessionMode === "composer" && (
            <div style={{
              padding: 14,
              borderRadius: 8,
              border: "0.5px solid var(--color-border)",
              background: composerRecording ? "var(--color-card-fill-deep)" : "var(--color-card-fill)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <Icon name="mic" size={16} />
              <div>
                <div className="t-card-label">{composerRecording ? "Recording source" : "Source captured"}</div>
                <div className="t-meta" style={{ marginTop: 2 }}>Notation queues when you save</div>
              </div>
            </div>
          )}

          <button
            onClick={() => setPieceSheetOpen(true)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}
          >
            <div className="t-card-label" style={{ fontSize: 18 }}>{pieceName ?? "Free Practice"}</div>
            <div className="t-meta">Tap to switch piece</div>
          </button>

          <button
            onClick={() => setMusicSheetOpen(true)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}
          >
            <div className="t-card-label" style={{ fontSize: 15 }}>{sheetMusicTitle ?? selectedSheetMusic?.title ?? "No sheet music"}</div>
            <div className="t-meta">Tap to switch score</div>
          </button>

          <div className="chip-row" style={{ justifyContent: "center" }}>
            {FOCUS.map((f) => (
              <button
                key={f}
                className={`chip press ${focusType === f ? "active" : ""}`}
                onClick={() => setFocusType(f)}
              >{f}</button>
            ))}
          </div>

          <div style={{ marginTop: "auto" }}>
            <textarea
              className="textarea"
              placeholder="Add a note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: 92 }}
            />
            <button className="cta" style={{ marginTop: 16 }} onClick={() => setConfirmOpen(true)}>
              End Session
            </button>
          </div>
        </div>
      </div>

      <BottomSheet open={pieceSheetOpen} onClose={() => setPieceSheetOpen(false)} title="Switch Piece">
        <PiecePicker pieces={pieces} activePieceId={pieceId} onPick={(id, name) => { setPiece(id, name); setPieceSheetOpen(false); }} />
      </BottomSheet>

      <BottomSheet open={musicSheetOpen} onClose={() => setMusicSheetOpen(false)} title="Switch Sheet Music">
        <div className="col" style={{ gap: 8 }}>
          {sheetMusic.map((item) => (
            <button
              key={item.id}
              className="press"
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: 16,
                background: activeSheetMusic?.id === item.id ? "var(--color-card-fill-deep)" : "transparent",
                borderRadius: 8,
                borderBottom: "0.5px solid var(--color-border)",
              }}
              onClick={() => {
                setSelectedSheetMusicId(item.id);
                setSheetMusic(item.id, item.title);
                setMusicSheetOpen(false);
              }}
            >
              <div className="t-card-label">{item.title}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>{[item.composer, item.sourceName ?? item.origin].filter(Boolean).join(" · ")}</div>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="End session?">
        <div className="t-meta" style={{ marginBottom: 16 }}>
          {sessionMode === "composer" ? "Your source audio will queue for notation." : "This is what you've put in."}
        </div>
        <div className="card">
          <SummaryRow label="Duration" value={formatDuration(elapsed)} />
          <SummaryRow label="Piece" value={pieceName ?? "-"} />
          <SummaryRow label="Sheet music" value={sheetMusicTitle ?? activeSheetMusic?.title ?? "-"} />
          <SummaryRow label="Focus" value={focusType} last={!notes.trim()} />
          {notes.trim() && (
            <div style={{ padding: "14px 0" }}>
              <div className="t-caption muted" style={{ marginBottom: 6 }}>Note</div>
              <div className="t-body" style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{notes}</div>
            </div>
          )}
        </div>
        {(error || composerError) && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-danger)" }}>{error ?? composerError}</div>
        )}
        <div className="row" style={{ gap: 12, marginTop: 20 }}>
          <button
            className="cta"
            disabled={saving}
            style={{ background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border)" }}
            onClick={() => setConfirmOpen(false)}
          >Keep Going</button>
          <button className="cta" disabled={saving} onClick={() => void endSession()}>
            {saving ? "Saving..." : "Save & End"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function PiecePicker({
  pieces,
  activePieceId,
  onPick,
}: {
  pieces: FallbackPiece[];
  activePieceId: string | null;
  onPick: (id: string, name: string) => void;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      {pieces.map((p) => (
        <button
          key={p.id}
          className="press"
          style={{
            display: "block", width: "100%", textAlign: "left",
            padding: 16,
            background: activePieceId === p.id ? "var(--color-card-fill-deep)" : "transparent",
            borderRadius: 8,
            borderBottom: "0.5px solid var(--color-border)",
          }}
          onClick={() => onPick(p.id, p.name)}
        >
          <div className="t-card-label">{p.name}</div>
          <div className="t-meta" style={{ marginTop: 4 }}>{p.composer}</div>
        </button>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      padding: "14px 0",
      borderBottom: last ? "none" : "0.5px solid var(--color-border)",
    }}>
      <span className="t-caption muted">{label}</span>
      <span className="t-card-label" style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}
